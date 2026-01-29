@echo off
setlocal enabledelayedexpansion

REM إنشاء مجلد لجمع الصور إذا لم يكن موجوداً
if not exist "gathered_images" mkdir gathered_images

REM البحث عن جميع ملفات الصور
for /r %%i in (*.jpg *.jpeg *.png *.gif *.bmp *.tiff *.webp *.svg *.heic *.ico *.JPG *.JPEG *.PNG *.GIF *.BMP *.TIFF *.WEBP *.SVG *.HEIC *.ICO) do (
    set "filename=%%~nxi"
    set "name=%%~ni"
    set "ext=%%~xi"
    
    if exist "gathered_images\!filename!" (
        set "counter=1"
        :check_again
        if exist "gathered_images\!name!_!counter!!ext!" (
            set /a counter+=1
            goto check_again
        )
        copy "%%i" "gathered_images\!name!_!counter!!ext!" >nul
    ) else (
        copy "%%i" "gathered_images\!filename!" >nul
    )
)

echo تم جمع جميع الصور في مجلد 'gathered_images'
pause