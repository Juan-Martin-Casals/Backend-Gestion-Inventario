import requests

BASE_URL = "http://localhost:8080"

def test_get_apiventas_list_sales():
    session = requests.Session()
    login_url = f"{BASE_URL}/api/auth/login"
    ventas_url = f"{BASE_URL}/api/ventas"

    login_payload = {
        "email": "prueba1@gmail.com",
        "contrasena": "usuarioprueba123"
    }

    try:
        # Login to get the authentication cookie
        login_resp = session.post(login_url, json=login_payload, timeout=30)
        assert login_resp.status_code == 200, f"Login failed with status code {login_resp.status_code}"

        # Verify token cookie exists
        token_cookie = session.cookies.get("token")
        assert token_cookie is not None, "Authentication token cookie 'token' not found after login"

        # Access /api/ventas endpoint with the token cookie set by session
        ventas_resp = session.get(ventas_url, timeout=30)
        assert ventas_resp.status_code == 200, f"GET /api/ventas failed with status code {ventas_resp.status_code}"

        # Validate response content is a list of sales
        sales_response = ventas_resp.json()
        assert isinstance(sales_response, list), f"Response at /api/ventas is not a list, got {type(sales_response)}"
    finally:
        session.close()

test_get_apiventas_list_sales()