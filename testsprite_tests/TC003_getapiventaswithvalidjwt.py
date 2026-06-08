import requests

BASE_URL = "http://localhost:8080"
LOGIN_ENDPOINT = "/api/auth/login"
VENTAS_ENDPOINT = "/api/ventas"
TIMEOUT = 30

def test_get_api_ventas_with_valid_jwt():
    login_payload = {
        "email": "prueba1@gmail.com",
        "contrasena": "usuarioprueba123"
    }

    with requests.Session() as session:
        # Perform login to get token cookie
        login_response = session.post(
            BASE_URL + LOGIN_ENDPOINT,
            json=login_payload,
            timeout=TIMEOUT
        )
        assert login_response.status_code == 200, f"Login failed with status {login_response.status_code}"

        # The 'token' cookie must be present in session cookies
        token_cookie = session.cookies.get('token')
        assert token_cookie is not None, "JWT token cookie named 'token' not found after login"

        # Use the session (with token cookie) to call /api/ventas
        ventas_response = session.get(
            BASE_URL + VENTAS_ENDPOINT,
            timeout=TIMEOUT
        )
        assert ventas_response.status_code == 200, f"GET /api/ventas failed with status {ventas_response.status_code}"
        json_data = ventas_response.json()
        assert isinstance(json_data, dict), "Response JSON is not a dict"
        assert 'content' in json_data, "'content' key not found in response JSON"
        assert isinstance(json_data['content'], list), "'content' key is not a list"

test_get_api_ventas_with_valid_jwt()