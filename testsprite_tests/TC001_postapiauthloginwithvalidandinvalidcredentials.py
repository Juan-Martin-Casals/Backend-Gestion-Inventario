import requests

BASE_URL = "http://localhost:8080"
LOGIN_ENDPOINT = "/api/auth/login"
TIMEOUT = 30

def test_postapiauthloginwithvalidandinvalidcredentials():
    session = requests.Session()

    valid_credentials = {
        "email": "prueba1@gmail.com",
        "contrasena": "usuarioprueba123"
    }
    invalid_credentials = {
        "email": "prueba1@gmail.com",
        "contrasena": "wrongpassword"
    }

    # 1. Test login with valid credentials
    try:
        resp_valid = session.post(
            f"{BASE_URL}{LOGIN_ENDPOINT}",
            json=valid_credentials,
            timeout=TIMEOUT
        )
        assert resp_valid.status_code == 200, f"Expected 200, got {resp_valid.status_code}"
        # The token is returned in a 'token' cookie
        cookies = resp_valid.cookies
        assert 'token' in cookies, "JWT token cookie not found in response"
        token_cookie = cookies.get('token')
        assert token_cookie, "JWT token cookie is empty or missing"

        # Prepare a new session with the token for next requests
        auth_cookies = {'token': token_cookie}

        # 2. Test login with invalid credentials
        resp_invalid = requests.post(
            f"{BASE_URL}{LOGIN_ENDPOINT}",
            json=invalid_credentials,
            timeout=TIMEOUT
        )
        assert resp_invalid.status_code == 401, f"Expected 401, got {resp_invalid.status_code}"

        # 3. Retry with correct credentials after invalid attempt
        resp_retry = requests.post(
            f"{BASE_URL}{LOGIN_ENDPOINT}",
            json=valid_credentials,
            timeout=TIMEOUT
        )
        assert resp_retry.status_code == 200, f"Expected 200, got {resp_retry.status_code}"
        assert 'token' in resp_retry.cookies, "JWT token cookie not found in response after retry"
        token_cookie_retry = resp_retry.cookies.get('token')
        assert token_cookie_retry, "JWT token cookie is empty or missing after retry"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_postapiauthloginwithvalidandinvalidcredentials()