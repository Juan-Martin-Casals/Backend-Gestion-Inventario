import requests

def test_get_api_clientes_with_valid_and_missing_jwt():
    base_url = "http://localhost:8080"
    login_url = f"{base_url}/api/auth/login"
    clientes_url = f"{base_url}/api/clientes"
    login_payload = {
        "email": "prueba1@gmail.com",
        "contrasena": "usuarioprueba123"
    }

    with requests.Session() as session:
        # Login to get token cookie
        login_response = session.post(login_url, json=login_payload, timeout=30)
        assert login_response.status_code == 200, "Login failed with valid credentials"
        assert 'token' in session.cookies, "No 'token' cookie set after login"

        # Use session with token cookie to access /api/clientes
        clientes_response = session.get(clientes_url, timeout=30)
        assert clientes_response.status_code == 200, f"Expected 200 OK, got {clientes_response.status_code}"
        clientes_json = clientes_response.json()
        assert isinstance(clientes_json, dict), "Response JSON is not a dict"
        assert 'content' in clientes_json, "'content' key not in response JSON"
        assert isinstance(clientes_json['content'], list), "'content' is not a list"

    # Test accessing /api/clientes without token cookie
    no_auth_response = requests.get(clientes_url, timeout=30)
    assert no_auth_response.status_code in (401, 403), f"Expected 401 or 403 for missing JWT, got {no_auth_response.status_code}"

test_get_api_clientes_with_valid_and_missing_jwt()