import requests

BASE_URL = "http://localhost:8080"
LOGIN_ENDPOINT = "/api/auth/login"
PROVEEDORES_ENDPOINT = "/api/proveedores"
LOGIN_PAYLOAD = {"email": "prueba1@gmail.com", "contrasena": "usuarioprueba123"}
TIMEOUT = 30


def test_getapiproveedoreswithvalidandinvalidjwt():
    session = requests.Session()

    # Step 1: Authenticate to get valid JWT token in cookies
    login_resp = session.post(
        BASE_URL + LOGIN_ENDPOINT,
        json=LOGIN_PAYLOAD,
        timeout=TIMEOUT
    )
    assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
    assert "token" in login_resp.cookies, "Token cookie missing after login"
    token_cookie = login_resp.cookies.get("token")
    assert token_cookie, "Token cookie value is empty"

    # Step 2: GET /api/proveedores with valid JWT token (cookie)
    proveedores_resp = session.get(
        BASE_URL + PROVEEDORES_ENDPOINT,
        timeout=TIMEOUT
    )

    assert proveedores_resp.status_code == 200, f"Expected 200 status for valid JWT, got {proveedores_resp.status_code}"
    proveedores_json = proveedores_resp.json()
    assert isinstance(proveedores_json, dict), "Response is not a dict"
    assert "content" in proveedores_json, "'content' key missing in response"
    assert isinstance(proveedores_json["content"], list), "'content' is not a list"

    # Step 3: GET /api/proveedores with invalid JWT token (cookie)
    invalid_cookies = session.cookies.get_dict()
    invalid_cookies["token"] = "invalid.jwt.token"

    proveedores_invalid_resp = session.get(
        BASE_URL + PROVEEDORES_ENDPOINT,
        cookies=invalid_cookies,
        timeout=TIMEOUT
    )

    assert proveedores_invalid_resp.status_code in [401, 403], (
        f"Expected 401 or 403 for invalid JWT, got {proveedores_invalid_resp.status_code}"
    )
    # The response should not contain supplier data
    try:
        resp_json = proveedores_invalid_resp.json()
        # If JSON is present, 'content' key should not exist or be empty
        if isinstance(resp_json, dict):
            content = resp_json.get("content", None)
            assert not content, "Supplier data returned with invalid JWT"
    except ValueError:
        # Response is not JSON, which is also acceptable
        pass


test_getapiproveedoreswithvalidandinvalidjwt()