import requests

def test_post_apiauthlogin_valid_credentials():
    base_url = "http://localhost:8080"
    login_url = f"{base_url}/api/auth/login"
    payload = {
        "email": "prueba1@gmail.com",
        "contrasena": "usuarioprueba123"
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(login_url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # According to instructions, the JWT token is returned in an HTTP-Only cookie named "token"
    token_cookie = response.cookies.get("token")
    assert token_cookie is not None, "Token cookie not found in the response"
    # The status code should be 200 for successful login
    assert response.status_code == 200

test_post_apiauthlogin_valid_credentials()