import os
import qrcode, os
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer

qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=3)
qr.add_data('https://manelv74-creator.github.io/syd-constructores/')
qr.make(fit=True)
img = qr.make_image(image_factory=StyledPilImage, module_drawer=RoundedModuleDrawer())
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'QR_SYD_Constructores.png')
img.save(out)
print('QR guardado:', out)
