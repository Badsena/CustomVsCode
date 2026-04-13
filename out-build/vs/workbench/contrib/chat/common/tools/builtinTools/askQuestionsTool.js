/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { CancellationError } from '../../../../../../base/common/errors.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { hasKey } from '../../../../../../base/common/types.js';
import { generateUuid } from '../../../../../../base/common/uuid.js';
import { localize } from '../../../../../../nls.js';
import { IChatService } from '../../chatService/chatService.js';
import { ChatQuestionCarouselData } from '../../model/chatProgressTypes/chatQuestionCarouselData.js';
import { ChatConfiguration, ChatPermissionLevel } from '../../constants.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { StopWatch } from '../../../../../../base/common/stopwatch.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { ToolDataSource } from '../languageModelToolsService.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { raceCancellation } from '../../../../../../base/common/async.js';
/**
 * Response returned to the model when the user is not available (autopilot mode).
 */
export const AUTOPILOT_ASK_USER_RESPONSE = 'The user is not available to respond and will review your work later. Work autonomously and make good decisions.';
// Use a distinct id to avoid clashing with extension-provided tools
export const AskQuestionsToolId = 'vscode_askQuestions';
// Soft limits are used in the schema to guide the model
// Hard limits are more lenient and used to truncate if the model overshoots
//
// Example text at each limit:
// - header soft (50 chars):        "Which database engine do you want to use for this?"
// - header hard (75 chars):        "Which database engine and connection pooling strategy do you want to use here?"
// - question soft (200 chars):     "What testing framework would you like to use for this project? Consider factors like your team's familiarity, community support, and integration with your existing CI/CD pipeline when making a choice."
// - question hard (300 chars):     "What testing framework would you like to use for this project? Consider factors like your team's familiarity with the framework, community support and documentation quality, integration with your existing CI/CD pipeline, and the specific testing needs of your application architecture when deciding."
const SoftLimits = {
    header: 50,
    question: 200
};
const HardLimits = {
    header: 75,
    question: 300
};
function truncateToLimit(value, limit) {
    if (value === undefined) {
        return undefined;
    }
    if (value.length > limit) {
        return value.slice(0, limit - 3) + '...';
    }
    return value;
}
export function createAskQuestionsToolData() {
    const questionSchema = {
        type: 'object',
        properties: {
            header: {
                type: 'string',
                description: 'Short identifier for the question. Must be unique so answers can be mapped back to the question.',
                maxLength: SoftLimits.header
            },
            question: {
                type: 'string',
                description: 'The question text to display to the user. Keep it concise, ideally one sentence.',
                maxLength: SoftLimits.question
            },
            multiSelect: {
                type: 'boolean',
                description: 'Allow selecting multiple options when options are provided.'
            },
            allowFreeformInput: {
                type: 'boolean',
                description: 'Allow freeform text answers in addition to option selection. Defaults to true; set to false to restrict to predefined options only.'
            },
            options: {
                type: 'array',
                description: 'Optional list of selectable answers. If omitted, the question is free text.',
                items: {
                    type: 'object',
                    properties: {
                        label: {
                            type: 'string',
                            description: 'Display label and value for the option.'
                        },
                        description: {
                            type: 'string',
                            description: 'Optional secondary text shown with the option.'
                        },
                        recommended: {
                            type: 'boolean',
                            description: 'Mark this option as the recommended default.'
                        }
                    },
                    required: ['label']
                }
            }
        },
        required: ['header', 'question']
    };
    const inputSchema = {
        type: 'object',
        properties: {
            questions: {
                type: 'array',
                description: 'List of questions to ask the user. Order is preserved.',
                items: questionSchema,
                minItems: 1
            }
        },
        required: ['questions']
    };
    return {
        id: AskQuestionsToolId,
        toolReferenceName: 'askQuestions',
        legacyToolReferenceFullNames: [AskQuestionsToolId, 'vscode/askQuestions'],
        canBeReferencedInPrompt: false,
        icon: ThemeIcon.fromId(Codicon.question.id),
        displayName: localize(8850, null),
        userDescription: localize(8851, null),
        modelDescription: 'Use this tool to ask the user a small number of clarifying questions before proceeding. Provide the questions array with concise headers and prompts. Use options for fixed choices, set multiSelect when multiple selections are allowed. Users can always provide a freeform text answer alongside options unless you set allowFreeformInput to false.',
        source: ToolDataSource.Internal,
        inputSchema
    };
}
export const AskQuestionsToolData = createAskQuestionsToolData();
let AskQuestionsTool = class AskQuestionsTool extends Disposable {
    constructor(chatService, telemetryService, logService, configService) {
        super();
        this.chatService = chatService;
        this.telemetryService = telemetryService;
        this.logService = logService;
        this.configService = configService;
    }
    async invoke(invocation, _countTokens, progress, token) {
        const stopWatch = StopWatch.create(true);
        const parameters = invocation.parameters;
        const { questions } = parameters;
        this.logService.trace(`[AskQuestionsTool] Invoking with ${questions?.length ?? 0} question(s)`);
        if (!questions || questions.length === 0) {
            throw new Error(localize(8852, null));
        }
        const chatSessionResource = invocation.context?.sessionResource;
        const chatRequestId = invocation.chatRequestId;
        const { request, sessionResource } = this.getRequest(chatSessionResource, chatRequestId);
        if (!sessionResource || !request) {
            this.logService.warn('[AskQuestionsTool] Missing chat context; marking all questions as skipped.');
            return this.createSkippedResult(questions);
        }
        // In autopilot mode or when auto-reply is enabled, the user is not available —
        // auto-respond instead of blocking. Still append a completed carousel so the
        // user can see what was skipped.
        if (request.modeInfo?.permissionLevel === ChatPermissionLevel.Autopilot || this.configService.getValue(ChatConfiguration.AutoReply)) {
            const reason = request.modeInfo?.permissionLevel === ChatPermissionLevel.Autopilot ? 'Autopilot mode' : 'Auto-reply enabled';
            this.logService.info(`[AskQuestionsTool] ${reason}: auto-responding to questions`);
            const { carousel, idToHeaderMap } = this.toQuestionCarousel(questions);
            carousel.data = this.buildAutopilotCarouselAnswers(questions, carousel, idToHeaderMap);
            carousel.isUsed = true;
            this.chatService.appendProgress(request, carousel);
            return this.createAutopilotResult(questions);
        }
        const { carousel, idToHeaderMap } = this.toQuestionCarousel(questions);
        this.chatService.appendProgress(request, carousel);
        const answerResult = await raceCancellation(carousel.completion.p, token);
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        progress.report({ message: localize(8853, null) });
        const converted = this.convertCarouselAnswers(questions, answerResult?.answers, idToHeaderMap);
        const { answeredCount, skippedCount, freeTextCount, recommendedAvailableCount, recommendedSelectedCount } = this.collectMetrics(questions, converted);
        this.sendTelemetry(invocation.chatRequestId, questions.length, answeredCount, skippedCount, freeTextCount, recommendedAvailableCount, recommendedSelectedCount, stopWatch.elapsed());
        const toolResultJson = JSON.stringify(converted);
        this.logService.trace(`[AskQuestionsTool] Returning tool result with metrics: questions=${questions.length}, answered=${answeredCount}, skipped=${skippedCount}, freeText=${freeTextCount}, recommendedAvailable=${recommendedAvailableCount}, recommendedSelected=${recommendedSelectedCount}`);
        return {
            content: [{ kind: 'text', value: toolResultJson }]
        };
    }
    async prepareToolInvocation(context, _token) {
        const parameters = context.parameters;
        const { questions } = parameters;
        if (!questions || questions.length === 0) {
            throw new Error(localize(8854, null));
        }
        for (const question of questions) {
            if (question.options && question.options.length === 1) {
                throw new Error(localize(8855, null, question.header));
            }
            // Apply hard limits to truncate display values that exceed the more lenient hard limit
            // Note: The original header is preserved and used as the answer key in convertCarouselAnswers
            // to avoid collisions when distinct headers become identical after truncation
            question.question = truncateToLimit(question.question, HardLimits.question) ?? question.question;
        }
        const questionCount = questions.length;
        const headers = questions.map(q => q.header).join(', ');
        const message = questionCount === 1
            ? localize(8856, null, headers)
            : localize(8857, null, questionCount, headers);
        const pastMessage = questionCount === 1
            ? localize(8858, null, headers)
            : localize(8859, null, questionCount, headers);
        return {
            invocationMessage: new MarkdownString(message),
            pastTenseMessage: new MarkdownString(pastMessage)
        };
    }
    getRequest(chatSessionResource, chatRequestId) {
        if (!chatSessionResource) {
            return { request: undefined, sessionResource: undefined };
        }
        const model = this.chatService.getSession(chatSessionResource);
        let request;
        if (model) {
            // Prefer an exact match on chatRequestId when possible
            if (chatRequestId) {
                request = model.getRequests().find(r => r.id === chatRequestId);
            }
            // Fall back to the most recent request in the session if we can't find a match
            if (!request) {
                request = model.getRequests().at(-1);
            }
        }
        if (!request) {
            return { request: undefined, sessionResource: chatSessionResource };
        }
        return { request, sessionResource: chatSessionResource };
    }
    toQuestionCarousel(questions) {
        const idToHeaderMap = new Map();
        const mappedQuestions = questions.map(question => this.toChatQuestion(question, idToHeaderMap));
        return {
            carousel: new ChatQuestionCarouselData(mappedQuestions, true, generateUuid()),
            idToHeaderMap
        };
    }
    toChatQuestion(question, idToHeaderMap) {
        let type;
        if (!question.options || question.options.length === 0) {
            type = 'text';
        }
        else if (question.multiSelect) {
            type = 'multiSelect';
        }
        else {
            type = 'singleSelect';
        }
        let defaultValue;
        if (question.options) {
            const recommendedOptions = question.options.filter(opt => opt.recommended);
            if (recommendedOptions.length > 0) {
                defaultValue = question.multiSelect ? recommendedOptions.map(opt => opt.label) : recommendedOptions[0].label;
            }
        }
        // Use a stable UUID as the internal ID to avoid collisions when truncating headers
        // The original header is preserved in idToHeaderMap for answer correlation
        const internalId = generateUuid();
        idToHeaderMap.set(internalId, question.header);
        // Truncate header for display only
        const displayTitle = truncateToLimit(question.header, HardLimits.header) ?? question.header;
        return {
            id: internalId,
            type,
            title: displayTitle,
            message: question.question,
            options: question.options?.map(opt => ({
                id: opt.label,
                label: opt.description ? `${opt.label} - ${opt.description}` : opt.label,
                value: opt.label
            })),
            defaultValue,
            allowFreeformInput: question.allowFreeformInput ?? true
        };
    }
    convertCarouselAnswers(questions, carouselAnswers, idToHeaderMap) {
        const result = { answers: {} };
        if (carouselAnswers) {
            this.logService.trace(`[AskQuestionsTool] Carousel answer keys: ${Object.keys(carouselAnswers).join(', ')}`);
            this.logService.trace(`[AskQuestionsTool] Question headers: ${questions.map(q => q.header).join(', ')}`);
        }
        // Build a reverse map: original header -> internal ID
        const headerToIdMap = new Map();
        for (const [internalId, originalHeader] of idToHeaderMap) {
            headerToIdMap.set(originalHeader, internalId);
        }
        for (const question of questions) {
            if (!carouselAnswers) {
                result.answers[question.header] = {
                    selected: [],
                    freeText: null,
                    skipped: true
                };
                continue;
            }
            // Look up the answer using the internal ID that was used in the carousel
            const internalId = headerToIdMap.get(question.header);
            const answer = internalId ? carouselAnswers[internalId] : undefined;
            this.logService.trace(`[AskQuestionsTool] Processing question "${question.header}" (internal ID: ${internalId}), raw answer: ${JSON.stringify(answer)}, type: ${typeof answer}`);
            if (answer === undefined) {
                result.answers[question.header] = {
                    selected: [],
                    freeText: null,
                    skipped: true
                };
            }
            else if (typeof answer === 'string') {
                if (question.options?.some(opt => opt.label === answer)) {
                    result.answers[question.header] = {
                        selected: [answer],
                        freeText: null,
                        skipped: false
                    };
                }
                else {
                    result.answers[question.header] = {
                        selected: [],
                        freeText: answer,
                        skipped: false
                    };
                }
            }
            else if (Array.isArray(answer)) {
                result.answers[question.header] = {
                    selected: answer.map(a => String(a)),
                    freeText: null,
                    skipped: false
                };
            }
            else if (typeof answer === 'object' && hasKey(answer, { selectedValues: true })) {
                const { selectedValues, freeformValue } = answer;
                result.answers[question.header] = {
                    selected: selectedValues,
                    freeText: freeformValue ?? null,
                    skipped: false
                };
            }
            else if (typeof answer === 'object' && (hasKey(answer, { selectedValue: true }) || hasKey(answer, { freeformValue: true }))) {
                const { selectedValue, freeformValue } = answer;
                if (freeformValue) {
                    result.answers[question.header] = {
                        selected: [],
                        freeText: freeformValue,
                        skipped: false
                    };
                }
                else if (selectedValue !== undefined) {
                    if (question.options?.some(opt => opt.label === selectedValue)) {
                        result.answers[question.header] = {
                            selected: [selectedValue],
                            freeText: null,
                            skipped: false
                        };
                    }
                    else {
                        result.answers[question.header] = {
                            selected: [],
                            freeText: selectedValue,
                            skipped: false
                        };
                    }
                }
                else {
                    result.answers[question.header] = {
                        selected: [],
                        freeText: null,
                        skipped: true
                    };
                }
            }
            else {
                this.logService.warn(`[AskQuestionsTool] Unknown answer format for "${question.header}": ${JSON.stringify(answer)}`);
                result.answers[question.header] = {
                    selected: [],
                    freeText: null,
                    skipped: true
                };
            }
        }
        return result;
    }
    collectMetrics(questions, result) {
        const answers = Object.values(result.answers);
        const answeredCount = answers.filter(a => !a.skipped).length;
        const skippedCount = answers.filter(a => a.skipped).length;
        const freeTextCount = answers.filter(a => a.freeText !== null).length;
        const recommendedAvailableCount = questions.filter(q => q.options?.some(opt => opt.recommended)).length;
        const recommendedSelectedCount = questions.filter(q => {
            const answer = result.answers[q.header];
            const recommendedOption = q.options?.find(opt => opt.recommended);
            return answer && !answer.skipped && recommendedOption && answer.selected.includes(recommendedOption.label);
        }).length;
        return { answeredCount, skippedCount, freeTextCount, recommendedAvailableCount, recommendedSelectedCount };
    }
    createSkippedResult(questions) {
        const skippedAnswers = {};
        for (const question of questions) {
            skippedAnswers[question.header] = { selected: [], freeText: null, skipped: true };
        }
        return {
            content: [{ kind: 'text', value: JSON.stringify({ answers: skippedAnswers }) }]
        };
    }
    createAutopilotResult(questions) {
        const answers = {};
        for (const question of questions) {
            // Pick the recommended option if available, otherwise pick the first option
            const recommended = question.options?.find(opt => opt.recommended);
            const firstOption = question.options?.[0];
            const selected = recommended?.label ?? firstOption?.label;
            answers[question.header] = {
                selected: selected ? [selected] : [],
                freeText: selected ? null : AUTOPILOT_ASK_USER_RESPONSE,
                skipped: false,
            };
        }
        return {
            content: [{ kind: 'text', value: JSON.stringify({ answers }) }]
        };
    }
    /**
     * Build carousel answer data keyed by carousel question IDs for rendering
     * the completed summary in the UI during autopilot mode.
     */
    buildAutopilotCarouselAnswers(questions, carousel, idToHeaderMap) {
        const data = {};
        // Build reverse map: original header -> internal carousel question ID
        const headerToIdMap = new Map();
        for (const [internalId, originalHeader] of idToHeaderMap) {
            headerToIdMap.set(originalHeader, internalId);
        }
        for (const question of questions) {
            const internalId = headerToIdMap.get(question.header);
            if (!internalId) {
                continue;
            }
            const chatQuestion = carousel.questions.find(q => q.id === internalId);
            if (!chatQuestion) {
                continue;
            }
            const recommended = question.options?.find(opt => opt.recommended);
            const firstOption = question.options?.[0];
            const selectedLabel = recommended?.label ?? firstOption?.label;
            if (chatQuestion.type === 'text' || !selectedLabel) {
                data[internalId] = AUTOPILOT_ASK_USER_RESPONSE;
            }
            else if (chatQuestion.type === 'multiSelect') {
                data[internalId] = { selectedValues: [selectedLabel] };
            }
            else {
                data[internalId] = { selectedValue: selectedLabel };
            }
        }
        return data;
    }
    sendTelemetry(requestId, questionCount, answeredCount, skippedCount, freeTextCount, recommendedAvailableCount, recommendedSelectedCount, duration) {
        this.telemetryService.publicLog2('askQuestionsToolInvoked', {
            requestId,
            questionCount,
            answeredCount,
            skippedCount,
            freeTextCount,
            recommendedAvailableCount,
            recommendedSelectedCount,
            duration,
        });
    }
};
AskQuestionsTool = __decorate([
    __param(0, IChatService),
    __param(1, ITelemetryService),
    __param(2, ILogService),
    __param(3, IConfigurationService)
], AskQuestionsTool);
export { AskQuestionsTool };
//# sourceMappingURL=askQuestionsTool.js.map