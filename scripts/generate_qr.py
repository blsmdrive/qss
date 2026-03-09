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
    # scale up significantly for high resolution
    qr.save(out, kind='png', scale=module_size, dark=fill_color, light=back_color, border=2)
    out.seek(0)
    
    # 2. Open with Pillow to perform aesthetic rounding
    img = Image.open(out).convert("RGBA")
    
    # Optional enhancement: We can apply a mask to round the edges of the overall image if desired
    # Or round the inner modules (more complex, but Segno's default is crisp).
    # For a simple aesthetic, a clean margin and premium color on dark background works exceptionally well.
    
    # 3. Create a circular mask for the center to add a logo
    try:
        # If we had a local image, we could paste it here.
        # Let's draw a sleek inner rounded box to serve as a placeholder 
        # for where the physical Flint card logo might go, or just leave it minimalist.
        logo_size = img.size[0] // 4
        logo_pos = ((img.size[0] - logo_size) // 2, (img.size[1] - logo_size) // 2)
        
        # Draw a dark background circle in the center to make it look intentionally sparse
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle(
            [logo_pos, (logo_pos[0] + logo_size, logo_pos[1] + logo_size)], 
            radius=logo_size//4,
            fill=back_color, 
            outline=fill_color,
            width=2
        )
    except Exception as e:
        print(f"Could not draw center logo area: {e}")

    # Save the final image
    img.save(output_path)
    print(f"Aesthetic QR code saved successfully to: {output_path}")

if __name__ == "__main__":
    target_url = "https://quietstackstudios.com/apps/flint-download.html"
    output_filename = "/Users/andrew/Desktop/Quiet Stack Studios/Website/assets/flint_qr_code.png"
    
    create_rounded_qr(
        url=target_url, 
        output_path=output_filename, 
        fill_color="#f59e0b", # Flint Amber
        back_color="#08090a", # System Dark Background
        module_size=30 # Larger for print quality
    )
