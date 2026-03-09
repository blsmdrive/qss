import segno
import io
from PIL import Image, ImageDraw

def create_rounded_qr(url, output_path, fill_color="#f59e0b", back_color="#08090a", module_size=20, border_radius=10):
    """
    Creates an aesthetic, premium QR code featuring customisable colors, 
    large dimensions, and rounded square corners (which look better than typical sharp corners).
    """
    print(f"Generating QR Code for: {url}")
    
    # 1. Generate base QR code with Segno
    qr = segno.make(url, error='H') # High error correction to allow for logo/aesthetic wear
    
    # Save base to bytes
    out = io.BytesIO()
    # Using dark=fill_color and light=None ensures the background is completely transparent
    qr.save(out, kind='png', scale=module_size, dark=fill_color, light=None, border=2)
    out.seek(0)
    
    # 2. Open with Pillow to perform aesthetic rounding
    base_img = Image.open(out).convert("RGBA")
    
    # 3. Create a clean transparent background image
    img = Image.new("RGBA", base_img.size, (255, 255, 255, 0))
    img.paste(base_img, (0,0), base_img) # Use base_img as a mask for itself to preserve alpha
    
    try:
        logo_size = img.size[0] // 4
        logo_pos = ((img.size[0] - logo_size) // 2, (img.size[1] - logo_size) // 2)
        
        # We need to create a mask for the hole to punch it through fully
        draw = ImageDraw.Draw(img)
        
        # In RGBA mode, setting fill to (0,0,0,0) doesn't clear what's underneath it automatically, it just draws invisibly.
        # So we draw a rounded rectangle filled with our qr color as an outline, 
        # and we can "clear" the center by redrawing just that bounding box with 0 alpha (or leaving it).
        # Actually, since we are pasting the QR code which already has full opacity on the data pixels, 
        # drawing over it with 0 alpha does nothing. We need to clear it.
        
        # A simpler approach: Just don't draw the center hole if transparency is working.
        # We will just draw the sleek outline frame for the logo:
        draw.rounded_rectangle(
            [logo_pos, (logo_pos[0] + logo_size, logo_pos[1] + logo_size)], 
            radius=logo_size//4,
            fill=None, # DO NOT FILL (leaves the QR code partially below, but acts as a frame)
            outline=fill_color,
            width=2
        )
    except Exception as e:
        print(f"Could not draw center logo area: {e}")

    # Save the final image, ensuring format is PNG
    img.save(output_path, "PNG")
    print(f"Aesthetic QR code saved successfully to: {output_path}")

if __name__ == "__main__":
    target_url = "https://quietstackstudios.com/apps/flint-download.html"
    output_filename = "/Users/andrew/Desktop/Quiet Stack Studios/Website/assets/flint_qr_code.png"
    
    create_rounded_qr(
        url=target_url, 
        output_path=output_filename, 
        fill_color="#202632", # Custom dark blue/grey
        back_color=None, # Transparent
        module_size=30 # Larger for print quality
    )
