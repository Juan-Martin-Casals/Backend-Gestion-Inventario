import requests

BASE_URL = "http://localhost:8080"
LOGIN_ENDPOINT = "/api/auth/login"
PRODUCTS_ENDPOINT = "/api/productos"
TIMEOUT = 30

def test_get_apiproductos_list_products():
    login_payload = {
        "email": "prueba1@gmail.com",
        "contrasena": "usuarioprueba123"
    }

    with requests.Session() as session:
        # Login to get the token cookie
        login_response = session.post(
            BASE_URL + LOGIN_ENDPOINT,
            json=login_payload,
            timeout=TIMEOUT
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"

        # Check that 'token' cookie is present
        token_cookie = session.cookies.get("token")
        assert token_cookie is not None, "JWT token cookie 'token' not found after login"

        # Request the list of products with authentication cookie
        productos_response = session.get(
            BASE_URL + PRODUCTS_ENDPOINT,
            timeout=TIMEOUT
        )

        assert productos_response.status_code == 200, f"Failed to get products: {productos_response.text}"

        # Validate response structure
        try:
            productos_json = productos_response.json()
        except ValueError as e:
            assert False, f"Response is not valid JSON: {e}"

        # Adjust assertion to handle if response is an object with list inside
        assert isinstance(productos_json, dict), "Products response is not a JSON object"

        # Assuming list of products is in a key, try common keys
        products_list = None
        for key in ['productos', 'content', 'data', 'items']:
            if key in productos_json and isinstance(productos_json[key], list):
                products_list = productos_json[key]
                break

        assert products_list is not None, "No product list found under expected keys"

        # Check at least one product has expected keys if any
        if products_list:
            first_product = products_list[0]
            assert isinstance(first_product, dict), "Product item is not a dictionary"
            assert "nombre" in first_product, "Product does not have 'nombre' key"


test_get_apiproductos_list_products()
