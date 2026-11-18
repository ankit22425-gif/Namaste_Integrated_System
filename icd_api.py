
import os
import requests
from dotenv import load_dotenv
from requests.auth import HTTPBasicAuth

# Load environment variables
load_dotenv()

CLIENT_ID = os.getenv("ICD_CLIENT_ID")
CLIENT_SECRET = os.getenv("ICD_CLIENT_SECRET")

TOKEN_URL = "https://icdaccessmanagement.who.int/connect/token"


def get_icd_token():

    if not CLIENT_ID or not CLIENT_SECRET:
        raise ValueError(
            "ICD Client ID or Client Secret missing in .env file"
        )

    try:
        response = requests.post(
            TOKEN_URL,
            auth=HTTPBasicAuth(CLIENT_ID, CLIENT_SECRET),
            data={
                "grant_type": "client_credentials",
                "scope": "icdapi_access"
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded"
            },
            timeout=30
        )

        response.raise_for_status()

        token_data = response.json()

        access_token = token_data.get("access_token")

        if not access_token:
            raise ValueError("Access token not received from WHO")

        return {
            "access_token": access_token,
            "expires_in": token_data.get("expires_in")
        }

    except requests.exceptions.RequestException as error:
        raise RuntimeError(
            f"WHO ICD authentication failed: {error}"
        )


if __name__ == "__main__":

    try:
        token_data = get_icd_token()

        print("WHO ICD-11 Authentication Successful!")
        print("Access token received successfully.")
        print("Token expiry:", token_data["expires_in"], "seconds")

    except Exception as error:
        print("Error:", error)
