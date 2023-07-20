// Author: Joel Franusic <joel.franusic@okta.com>
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '';
}

function extractProperties(obj) {
    return Object.fromEntries(
        Object.keys(Object.getPrototypeOf(obj))
            .filter(key => isNonEmptyString(obj[key]))
            .map(key => [key, obj[key]])
    );
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        // https://developer.mozilla.org/en-US/docs/Web/API/Request#instance_properties
        const requestJson = JSON.stringify({
            ...extractProperties(request),
            body: await request.text(),
            headers: Object.fromEntries([...request.headers]),
            // https://developer.mozilla.org/en-US/docs/Web/API/URL#instance_properties
            whatwgURL: {
                ...extractProperties(url),
                searchParams: Object.fromEntries([...url.searchParams])
            }
        });
        const upstream = await fetch(env.WORKFLOW_URL, {
            method: "POST",
            body: requestJson,
        });
        return new Response(upstream.body, upstream);
    },
};
