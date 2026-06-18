#!/usr/bin/env python3
"""
Python script to upload a file to Google Drive.
Based on Google Developer Knowledge guidelines.
"""

import argparse
import mimetypes
import os
import sys

import google.auth
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

# If modifying these scopes, delete the file token.json.
SCOPES = ["https://www.googleapis.com/auth/drive.file"]


def get_credentials(credentials_path="credentials.json", token_path="token.json"):
    """
    Get user credentials.
    Tries to:
    1. Load saved token.json
    2. Fallback to OAuth client flow if credentials.json is provided
    3. Fallback to Application Default Credentials (ADC)
    """
    creds = None
    # 1. Look for existing token.json
    if os.path.exists(token_path):
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        except Exception as e:
            print(f"Warning: Could not load token from {token_path}: {e}")

    # If credentials are not valid/available, refresh or authenticate
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"Warning: Could not refresh token: {e}")
                creds = None
        else:
            # Try InstalledAppFlow if credentials.json exists
            if os.path.exists(credentials_path):
                flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
                creds = flow.run_local_server(port=0)
                # Save the credentials for the next run
                with open(token_path, "w") as token:
                    token.write(creds.to_json())
            else:
                # Fallback to Application Default Credentials (e.g. Service Account in environment)
                print("No credentials.json or token.json found. Trying Application Default Credentials...")
                try:
                    creds, _ = google.auth.default(scopes=SCOPES)
                except Exception as e:
                    print(f"Error loading credentials: {e}")
                    print("Please provide a credentials.json file or run in an environment with default credentials.")
                    sys.exit(1)
    return creds


def upload_file(file_path, drive_filename=None, mime_type=None, parent_folder_id=None, credentials_path="credentials.json"):
    """
    Uploads a file to Google Drive.
    """
    if not os.path.exists(file_path):
        print(f"Error: Local file '{file_path}' does not exist.")
        return None

    # Detect filename and mime type if not specified
    if not drive_filename:
        drive_filename = os.path.basename(file_path)
    
    if not mime_type:
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = "application/octet-stream"

    print(f"Uploading '{file_path}' as '{drive_filename}' ({mime_type})...")

    creds = get_credentials(credentials_path)

    try:
        service = build("drive", "v3", credentials=creds)

        file_metadata = {"name": drive_filename}
        if parent_folder_id:
            file_metadata["parents"] = [parent_folder_id]

        media = MediaFileUpload(file_path, mimetype=mime_type, resumable=True)

        file = (
            service.files()
            .create(body=file_metadata, media_body=media, fields="id, webViewLink")
            .execute()
        )

        print(f"File uploaded successfully!")
        print(f"File ID: {file.get('id')}")
        print(f"Link: {file.get('webViewLink')}")
        return file.get("id")

    except HttpError as error:
        print(f"An error occurred during upload: {error}")
        return None


def main():
    parser = argparse.ArgumentParser(description="Upload a file to Google Drive.")
    parser.add_argument("file_path", help="Path to the local file to upload")
    parser.add_argument("--name", help="Custom name for the file on Google Drive (default: local filename)")
    parser.add_argument("--mime", help="MIME type for the file (default: auto-detected)")
    parser.add_argument("--parent", help="Google Drive folder ID to place the file in")
    parser.add_argument("--creds", default="credentials.json", help="Path to client secrets credentials.json (default: credentials.json)")

    args = parser.parse_args()

    upload_file(
        file_path=args.file_path,
        drive_filename=args.name,
        mime_type=args.mime,
        parent_folder_id=args.parent,
        credentials_path=args.creds
    )


if __name__ == "__main__":
    main()
