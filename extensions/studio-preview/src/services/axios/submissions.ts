import axios from 'axios'

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
            `${process.env.NEXT_PUBLIC_API_END_POINT}/store_errors`,
            payload,
            { headers: { 'Content-Type': 'application/json' } },
        )
    } catch {
        // never propagate — error reporting must not break the app
    }
}

export async function fetchData(endpoint: any): Promise<any> {
    let token = ''

    console.log(token)
    token = token.substring(1, token?.length - 1)
    // const token_type = Cookies.get('type')
    // token_type && token_type == 'link'
    //     ? (token = token)
    //     : (token = token.substring(1, token?.length - 1))

    try {
        const response = await axios.get<any>(`${endpoint}`, {
            headers: {
                // Authorization: 'Bearer '.concat(
                //     token.substring(1, token?.length - 1),
                // ),

                Authorization: 'Bearer '.concat(token),
            },
        })
        return response.data
    } catch (error: any) {
        console.log(error)
        if (error?.status == 401) {
        }

        if (error?.response?.status == 401) {
        } else if (error?.response?.status == 403) {

        } else if ([404, 500].includes(error?.response?.status)) {
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
    // onProgress?: any,
): Promise<any> {
    let token = ''

    const formData = new FormData()
    appendFormData(formData, values)

    if (type === 1) {
        formData.append('_method', 'PUT')
    }
    token = token.substring(1, token?.length - 1)

    // const token_type = Cookies.get('type')
    // token_type && token_type == 'link'
    //     ? (token = token)
    //     : (token = token.substring(1, token?.length - 1))

    try {
        const response = await axios.post(endpoint, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: 'Bearer '.concat(token),
            },
        })
        return response.data
    } catch (error: any) {
        console.log(error)
        if (error?.status == 401) {
        }

        if (error?.response?.status == 401) {
        } else if (error?.response?.status == 403) {

        } else if ([404, 500].includes(error?.response?.status)) {
            if (error?.response?.status === 500) {
                storeError(endpoint, error)
            }
        }
        throw error
    }
}

function appendFormData(formData: FormData, data: any, parentKey = '') {
    if (data && typeof data === 'object' && !(data instanceof File)) {
        Object.keys(data).forEach((key) => {
            const value = data[key]
            const formKey = parentKey ? `${parentKey}[${key}]` : key
            appendFormData(formData, value, formKey)
        })
    } else {
        // Only append if not null or undefined
        if (data !== null && data !== undefined) {
            formData.append(parentKey, data)
        }
    }
}

export async function jsonsubmitData(
    values: any,
    endpoint: string,
    type: number,
): Promise<any> {
    let token = ''

    // Convert values to JSON string, excluding _method
    const { ...payload } = values
    const jsonPayload = JSON.stringify(payload)

    // Determine method based on type
    const method = type === 1 ? 'PUT' : 'POST'

    // const token_type = Cookies.get('type')
    // token_type && token_type == 'link'
    //     ? (token = token)
    //     : (token = token.substring(1, token?.length - 1))
    try {
        const response = await axios({
            method,
            url: endpoint,
            data: jsonPayload,
            headers: {
                'Content-Type': 'application/json',
                // Authorization: 'Bearer '.concat(
                //     token.substring(1, token?.length - 1),
                // ),

                Authorization: 'Bearer '.concat(token),
            },
        })

        return response.data
    } catch (error: any) {
        console.log(error)
        if (error?.status == 401) {
        }

        if (error?.response?.status == 401) {
        } else if (error?.response?.status == 403) {

        } else if (error?.response?.status == 409) {
        } else {
            if (error?.response?.status === 500) {
                storeError(endpoint, error)
            }
        }
        throw error
    }
}
