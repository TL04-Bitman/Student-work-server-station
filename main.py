import tkinter as tk
import random
import math
from PIL import Image, ImageTk

class FullScreenTextApp:
    def __init__(self, root):
        self.root = root
        self.root.title("满屏文字")
        self.root.attributes("-fullscreen", True)
        self.root.configure(bg="black")
        
        self.text = "豪情天下"
        self.canvas = tk.Canvas(root, bg="black", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)
        
        self.text_items = []
        self.image_items = []
        self.animation_offset = 0
        self.video_caps = {}
        
        self.load_images()
        self.bind_events()
        self.create_text_items()
        self.create_image_items()
        self.animate()
    
    def load_images(self):
        self.images = []
        
        try:
            gif_frames = []
            img = Image.open("1.gif")
            for frame in range(img.n_frames):
                img.seek(frame)
                gif_frames.append(img.copy())
            self.images.append({
                "type": "gif",
                "frames": gif_frames,
                "current_frame": 0,
                "interval": img.info.get("duration", 100),
                "source": "1.gif"
            })
        except Exception as e:
            print(f"Failed to load 1.gif: {e}")
        
        try:
            jpeg_img = Image.open("2.jpeg")
            self.images.append({
                "type": "jpeg",
                "frames": [jpeg_img.copy()],
                "current_frame": 0,
                "interval": 0,
                "source": "2.jpeg"
            })
        except Exception as e:
            print(f"Failed to load 2.jpeg: {e}")
        
        try:
            import cv2
            cap = cv2.VideoCapture("3.mp4")
            if cap.isOpened():
                fps = cap.get(cv2.CAP_PROP_FPS)
                interval = int(1000 / fps) if fps > 0 else 33
                self.images.append({
                    "type": "video",
                    "frames": [],
                    "current_frame": 0,
                    "interval": interval,
                    "source": "3.mp4",
                    "cap": cap,
                    "total_frames": int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                })
            else:
                print("Failed to open 3.mp4")
        except Exception as e:
            print(f"Failed to load 3.mp4: {e}")
    
    def bind_events(self):
        self.root.bind("<Escape>", self.exit_fullscreen)
        self.canvas.bind("<Configure>", self.on_resize)
    
    def exit_fullscreen(self, event=None):
        for img_data in self.images:
            if img_data.get("type") == "video" and img_data.get("cap"):
                img_data["cap"].release()
        self.root.attributes("-fullscreen", False)
        self.root.quit()
    
    def on_resize(self, event):
        self.canvas.delete("all")
        self.text_items = []
        self.image_items = []
        self.create_text_items()
        self.create_image_items()
    
    def get_random_color(self):
        r = random.randint(0, 255)
        g = random.randint(0, 255)
        b = random.randint(0, 255)
        return f"#{r:02x}{g:02x}{b:02x}"
    
    def get_random_size(self):
        return random.randint(16, 65)
    
    def get_random_image_size(self):
        return random.randint(30, 120)
    
    def create_text_items(self):
        width = self.canvas.winfo_width()
        height = self.canvas.winfo_height()
        
        if width == 0 or height == 0:
            return
        
        item_width = 150
        item_height = 80
        
        cols = width // item_width + 2
        rows = height // item_height + 2
        
        for row in range(rows):
            for col in range(cols):
                x = col * item_width + random.randint(-20, 20)
                y = row * item_height + random.randint(-20, 20)
                size = self.get_random_size()
                color = self.get_random_color()
                
                text_id = self.canvas.create_text(
                    x, y,
                    text=self.text,
                    fill=color,
                    font=("微软雅黑", size, "bold"),
                    anchor="center"
                )
                
                self.text_items.append({
                    "id": text_id,
                    "x": x,
                    "y": y,
                    "size": size,
                    "color": color,
                    "dx": random.uniform(-2, 2),
                    "dy": random.uniform(-2, 2),
                    "speed": random.uniform(0.5, 2),
                    "direction": random.uniform(0, math.pi * 2)
                })
    
    def create_image_items(self):
        if not self.images:
            return
        
        width = self.canvas.winfo_width()
        height = self.canvas.winfo_height()
        
        if width == 0 or height == 0:
            return
        
        img_count = 10
        
        for img_data in self.images:
            for _ in range(img_count):
                x = random.randint(0, width)
                y = random.randint(0, height)
                img_size = self.get_random_image_size()
                
                if img_data["type"] == "video":
                    import cv2
                    ret, frame = img_data["cap"].read()
                    if ret:
                        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        pil_frame = Image.fromarray(frame)
                    else:
                        pil_frame = Image.new("RGB", (img_size, img_size), (0, 0, 0))
                else:
                    pil_frame = img_data["frames"][0].resize((img_size, img_size), Image.Resampling.LANCZOS)
                
                frame = pil_frame.resize((img_size, img_size), Image.Resampling.LANCZOS)
                photo = ImageTk.PhotoImage(frame)
                
                img_id = self.canvas.create_image(
                    x, y,
                    image=photo,
                    anchor="center"
                )
                
                self.image_items.append({
                    "id": img_id,
                    "x": x,
                    "y": y,
                    "size": img_size,
                    "photo": photo,
                    "img_data": img_data,
                    "dx": random.uniform(-3, 3),
                    "dy": random.uniform(-3, 3),
                    "speed": random.uniform(0.5, 2),
                    "direction": random.uniform(0, math.pi * 2)
                })
    
    def update_animated_frames(self):
        import cv2
        
        for img_data in self.images:
            if img_data["type"] == "gif":
                img_data["current_frame"] = (img_data["current_frame"] + 1) % len(img_data["frames"])
                current_pil_frame = img_data["frames"][img_data["current_frame"]]
                
                for item in self.image_items:
                    if item["img_data"] == img_data:
                        frame = current_pil_frame.resize((item["size"], item["size"]), Image.Resampling.LANCZOS)
                        item["photo"] = ImageTk.PhotoImage(frame)
                        self.canvas.itemconfig(item["id"], image=item["photo"])
            
            elif img_data["type"] == "video":
                cap = img_data["cap"]
                if cap.isOpened():
                    ret, frame = cap.read()
                    if ret:
                        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        current_pil_frame = Image.fromarray(frame)
                        
                        for item in self.image_items:
                            if item["img_data"] == img_data:
                                frame = current_pil_frame.resize((item["size"], item["size"]), Image.Resampling.LANCZOS)
                                item["photo"] = ImageTk.PhotoImage(frame)
                                self.canvas.itemconfig(item["id"], image=item["photo"])
                    else:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        
        self.root.after(33, self.update_animated_frames)
    
    def animate(self):
        self.animation_offset += 0.02
        width = self.canvas.winfo_width()
        height = self.canvas.winfo_height()
        
        for item in self.text_items:
            item["x"] += item["dx"]
            item["y"] += item["dy"]
            
            if item["x"] < -150 or item["x"] > width + 50:
                item["dx"] *= -1
            if item["y"] < -50 or item["y"] > height + 50:
                item["dy"] *= -1
            
            if random.random() < 0.01:
                item["dx"] += random.uniform(-0.5, 0.5)
                item["dy"] += random.uniform(-0.5, 0.5)
                item["dx"] = max(-4, min(4, item["dx"]))
                item["dy"] = max(-4, min(4, item["dy"]))
            
            float_dx = math.sin(self.animation_offset * item["speed"] + item["direction"]) * 3
            float_dy = math.cos(self.animation_offset * item["speed"] + item["direction"]) * 2
            
            self.canvas.coords(
                item["id"],
                item["x"] + float_dx,
                item["y"] + float_dy
            )
            
            if random.random() < 0.005:
                new_color = self.get_random_color()
                self.canvas.itemconfig(item["id"], fill=new_color)
                item["color"] = new_color
        
        for item in self.image_items:
            item["x"] += item["dx"]
            item["y"] += item["dy"]
            
            if item["x"] < -item["size"] or item["x"] > width + item["size"]:
                item["dx"] *= -1
            if item["y"] < -item["size"] or item["y"] > height + item["size"]:
                item["dy"] *= -1
            
            if random.random() < 0.01:
                item["dx"] += random.uniform(-0.5, 0.5)
                item["dy"] += random.uniform(-0.5, 0.5)
                item["dx"] = max(-5, min(5, item["dx"]))
                item["dy"] = max(-5, min(5, item["dy"]))
            
            float_dx = math.sin(self.animation_offset * item["speed"] + item["direction"]) * 3
            float_dy = math.cos(self.animation_offset * item["speed"] + item["direction"]) * 2
            
            self.canvas.coords(
                item["id"],
                item["x"] + float_dx,
                item["y"] + float_dy
            )
        
        self.root.after(16, self.animate)
        if not hasattr(self, 'anim_started'):
            self.anim_started = True
            self.update_animated_frames()

if __name__ == "__main__":
    root = tk.Tk()
    app = FullScreenTextApp(root)
    root.mainloop()