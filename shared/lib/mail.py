
from django.core.mail import send_mail
from ..config import EMAIL_FROM
from . import logging

def send(to, subject, message):
    if not isinstance(to, list):
        to = [to]
    logging.log(category="mail", to=to, subject=subject, message=message)
    try:
        send_mail(subject, message, EMAIL_FROM, to)
    except:
        logging.logException()
    