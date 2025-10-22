import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
from dotenv import load_dotenv

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("EMAIL_USER"),
    MAIL_PASSWORD=os.getenv("EMAIL_PASS"),
    MAIL_FROM=os.getenv("EMAIL_USER"),
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_TLS=True,
    MAIL_SSL=False,
)

fm = FastMail(conf)

async def send_verification_email(to: EmailStr, code: str):
    """
    보안 메일 발송 (인증코드 포함)
    """
    message = MessageSchema(
        subject="회원가입 인증 코드",
        recipients=[to],
        body=f"인증코드: {code}",
        subtype="plain"
    )
    await fm.send_message(message)
