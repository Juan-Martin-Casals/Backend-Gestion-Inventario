import requests

BASE_URL = "http://localhost:8080"
LOGIN_ENDPOINT = "/api/auth/login"
PRODUCTOS_ENDPOINT = "/api/productos"
LOGIN_PAYLOAD = {"email": "prueba1@gmail.com", "contrasena": "usuarioprueba123"}
TIMEOUT = 30


def test_get_api_productos_with_valid_and_invalid_jwt():
    session = requests.Session()
    try:
        # Step 1: Login with valid credentials to get the JWT token cookie
        login_resp = session.post(
            BASE_URL + LOGIN_ENDPOINT,
            json=LOGIN_PAYLOAD,
            timeout=TIMEOUT,
        )
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        assert 'token' in session.cookies, "JWT token cookie not found after login"

        # Extract token cookie value for manual invalidation test
        valid_token = session.cookies.get('token')

        # Step 2: Test GET /api/productos with valid JWT token from cookie
        headers = {}  # No Authorization header, authentication via cookie only
        productos_resp = session.get(
            BASE_URL + PRODUCTOS_ENDPOINT,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert productos_resp.status_code == 200, f"Expected 200 for valid JWT, got {productos_resp.status_code}"
        productos_json = productos_resp.json()
        assert isinstance(productos_json, dict), "Response JSON is not a dict"
        assert 'content' in productos_json, "Response JSON does not contain 'content' key"
        assert isinstance(productos_json['content'], list), "'content' key is not a list"

        # Step 3a: Test GET /api/productos with missing JWT cookie
        session_no_token = requests.Session()  # new session with no cookies
        resp_no_token = session_no_token.get(
            BASE_URL + PRODUCTOS_ENDPOINT,
            timeout=TIMEOUT,
        )
        assert resp_no_token.status_code in (401, 403), f"Expected 401 or 403 for missing JWT, got {resp_no_token.status_code}"
        # Should not return product data
        try:
            json_no_token = resp_no_token.json()
            assert not ('content' in json_no_token and isinstance(json_no_token['content'], list)), "Product data returned without JWT"
        except ValueError:
            # Response body not JSON is acceptable for error
            pass

        # Step 3b: Test GET /api/productos with invalid JWT cookie
        session_invalid_token = requests.Session()
        session_invalid_token.cookies.set('token', 'invalid.jwt.token')
        resp_invalid_token = session_invalid_token.get(
            BASE_URL + PRODUCTOS_ENDPOINT,
            timeout=TIMEOUT,
        )
        assert resp_invalid_token.status_code in (401, 403), f"Expected 401 or 403 for invalid JWT, got {resp_invalid_token.status_code}"
        # Should not return product data
        try:
            json_invalid_token = resp_invalid_token.json()
            assert not ('content' in json_invalid_token and isinstance(json_invalid_token['content'], list)), "Product data returned with invalid JWT"
        except ValueError:
            # Response body not JSON is acceptable for error
            pass

    finally:
        session.close()


test_get_api_productos_with_valid_and_invalid_jwt()