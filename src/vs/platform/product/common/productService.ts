/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IProductConfiguration } from '../../../base/common/product.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';

export const IProductService = createDecorator<IProductService>('productService');

export interface IProductService extends Readonly<IProductConfiguration> {

	readonly _serviceBrand: undefined;
	// ✅ Amypo custom update fields
	readonly amypoAppVersion?: string;
	readonly amypoUpdateUrl?: string;

}

export const productSchemaId = 'vscode://schemas/vscode-product';
