import requests

BASE_URL = "http://localhost:8080"
LOGIN_ENDPOINT = "/api/auth/login"
COMPRAS_ENDPOINT = "/api/compras"
LOGIN_PAYLOAD = {"email": "prueba1@gmail.com", "contrasena": "usuarioprueba123"}
TIMEOUT = 30

def test_get_api_compras_with_valid_jwt():
    session = requests.Session()
    try:
        # Authenticate and get token cookie
        login_response = session.post(
            BASE_URL + LOGIN_ENDPOINT,
            json=LOGIN_PAYLOAD,
            timeout=TIMEOUT
        )
        assert login_response.status_code == 200, f"Login failed with status {login_response.status_code}"

        # The token cookie must be present
        assert 'token' in login_response.cookies, "JWT token cookie missing after login"

        # Using the session which now has the 'token' cookie, call the /api/compras GET endpoint
        response = session.get(BASE_URL + COMPRAS_ENDPOINT, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"

        data = response.json()
        assert isinstance(data, dict), f"Response JSON is not a dict but {type(data)}"
        assert 'content' in data, "'content' key not found in response JSON"
        assert isinstance(data['content'], list), f"'content' should be a list but is {type(data['content'])}"
    finally:
        session.close()

test_get_api_compras_with_valid_jwt()