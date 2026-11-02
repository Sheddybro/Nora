from PIL import Image, UnidentifiedImageError
from django.core.exceptions import ValidationError
import warnings

MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_PRODUCT_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}


def validate_product_image(upload):
    if upload.size > MAX_PRODUCT_IMAGE_BYTES:
        raise ValidationError("Product images must be 5 MiB or smaller.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(upload) as image:
                if image.format not in ALLOWED_PRODUCT_IMAGE_FORMATS:
                    raise ValidationError("Upload a JPEG, PNG, or WebP image.")
                if image.width > 8000 or image.height > 8000 or image.width * image.height > 40_000_000:
                    raise ValidationError("Product image dimensions exceed the supported limit.")
                upload.image_format = image.format
                image.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValidationError("The uploaded file is not a valid supported image.") from exc
    finally:
        upload.seek(0)