import axios from 'axios'

// Default API endpoint if environment variable is missing
const BASE_URL = 'https://1102amy21.amypo.ai/api';

// to store 500 errors
async function storeError(url: string, error: any): Promise<void> {
    try {
        const payload: Record<string, any> = {
            url,
            error:
                error?.response?.data
                    ? JSON.stringify(error.response.data)
                    : String(error?.message ?? error),
        }

        await axios.post(
            `${BASE_URL}/store_errors`,
            payload,
            { headers: { 'Content-Type': 'application/json' } },
        )
    } catch {
        // never propagate — error reporting must not break the app
    }
}

function getSafeToken(token: string | undefined): string {
    if (!token || token.length < 2) return '';
    if (token.startsWith('"') && token.endsWith('"')) {
        return token.substring(1, token.length - 1);
    }
    return token;
}

export async function fetchData(endpoint: any): Promise<any> {
    const rawToken = '';
    const token = getSafeToken(rawToken);

    try {
        const response = await axios.get<any>(`${endpoint}`, {
            headers: {
                Authorization: token ? `Bearer ${token}` : '',
            },
        })
        return response.data
    } catch (error: any) {
        console.error('[Submissions] fetchData error:', error);
        if ([404, 500].includes(error?.response?.status)) {
            if (error?.response?.status === 500) {
                storeError(endpoint, error)
            }
        }
        throw error
    }
}

export async function submitData(
    values: any,
    endpoint: string,
    type: number,
    token: string,
): Promise<any> {
    token = getSafeToken(token);

    try {
        // In Node.js, we should use objects for JSON or form-data for files.
        // Assuming JSON for now as it's more stable in this context.
        const payload = { ...values };
        if (type === 1) {
            payload['_method'] = 'PUT';
        }

        const response = await axios.post(endpoint, payload, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: token ? `Bearer ${token}` : '',
            },
        })
        return response.data
    } catch (error: any) {
        console.error('[Submissions] submitData error:', error);
        if ([404, 500].includes(error?.response?.status)) {
            if (error?.response?.status === 500) {
                storeError(endpoint, error)
            }
        }
        throw error
    }
}

export async function jsonsubmitData(
    values: any,
    endpoint: string,
    type: number,
): Promise<any> {
    const rawToken = '';
    const token = getSafeToken(rawToken);

    const payload = { ...values };
    const method = type === 1 ? 'PUT' : 'POST';

    try {
        const response = await axios({
            method,
            url: endpoint,
            data: payload,
            headers: {
                'Content-Type': 'application/json',
                Authorization: token ? `Bearer ${token}` : '',
            },
        })

        return response.data
    } catch (error: any) {
        console.error('[Submissions] jsonsubmitData error:', error);
        if (error?.response?.status === 500) {
            storeError(endpoint, error)
        }
        throw error
    }
}

