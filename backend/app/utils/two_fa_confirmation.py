
import pyotp

def generate_secret():
    return pyotp.random_base32()

def verify_otp(secret, otp):
    totp = pyotp.TOTP(secret)
    return totp.verify(otp)
