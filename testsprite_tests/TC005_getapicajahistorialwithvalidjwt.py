import requests

BASE_URL = "http://localhost:8080"
LOGIN_ENDPOINT = "/api/auth/login"
HISTORIAL_ENDPOINT = "/api/caja/historial"
LOGIN_PAYLOAD = {"email": "prueba1@gmail.com", "contrasena": "usuarioprueba123"}
TIMEOUT = 30


def test_getapicajahistorialwithvalidjwt():
    session = requests.Session()
    # Login to get token cookie
    login_response = session.post(
        BASE_URL + LOGIN_ENDPOINT,
        json=LOGIN_PAYLOAD,
        timeout=TIMEOUT
    )
    assert login_response.status_code == 200, f"Login failed with status code {login_response.status_code}"
    # Validate token cookie exists
    assert "token" in session.cookies, "Token cookie not found after login"

    # Access /api/caja/historial with token cookie set via session
    historial_response = session.get(
        BASE_URL + HISTORIAL_ENDPOINT,
        timeout=TIMEOUT
    )
    assert historial_response.status_code == 200, f"Historial request failed with status code {historial_response.status_code}"

    json_data = historial_response.json()
    assert isinstance(json_data, dict), "Response JSON is not a dictionary"
    assert "content" in json_data, "'content' key not found in response JSON"
    assert isinstance(json_data["content"], list), "'content' is not a list"


test_getapicajahistorialwithvalidjwt()