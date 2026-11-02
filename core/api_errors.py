from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None

    detail = response.data
    if isinstance(detail, dict) and "detail" in detail:
        message = str(detail["detail"])
        code = str(detail.get("code", "request_error"))
        fields = {key: value for key, value in detail.items() if key not in {"detail", "code"}}
    elif isinstance(detail, dict):
        message = "Request validation failed."
        code = "validation_error"
        fields = detail
    else:
        message = str(detail)
        code = "request_error"
        fields = None

    body = {"error": {"code": code, "message": message}}
    if fields:
        body["error"]["fields"] = fields
    response.data = body
    return response
