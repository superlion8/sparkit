#!/usr/bin/env python3
"""
简单的图标生成脚本
如果安装了 Pillow，运行此脚本可以生成图标
否则会提示手动创建
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
    
    os.makedirs('.', exist_ok=True)
    
    sizes = [16, 48, 128]
    for size in sizes:
        # 创建图片
        img = Image.new('RGB', (size, size), color='#667eea')
        draw = ImageDraw.Draw(img)
        
        # 绘制简单的 'M'
        if size >= 48:
            try:
                # 尝试使用系统字体
                font_size = int(size * 0.6)
                font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', font_size)
            except:
                try:
                    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', font_size)
                except:
                    font = ImageFont.load_default()
            
            text = 'M'
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            position = ((size - text_width) // 2, (size - text_height) // 2 - 2)
            draw.text(position, text, fill='white', font=font)
        else:
            # 小图标：绘制简单的矩形
            margin = size // 4
            draw.rectangle([margin, margin, size - margin, size - margin], fill='white')
        
        img.save(f'icon{size}.png')
        print(f'✓ Created icon{size}.png')
    
    print('\n所有图标已创建完成！')
    
except ImportError:
    print("Pillow 未安装。请运行以下命令安装：")
    print("  pip install Pillow")
    print("\n或者手动创建图标文件（见 README.md）")
except Exception as e:
    print(f"创建图标时出错: {e}")
    print("请手动创建图标文件（见 README.md）")
