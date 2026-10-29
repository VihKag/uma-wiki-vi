@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo == Cap nhat du lieu Global ==
node scripts\update.mjs || goto :err
git add -A
git diff --cached --quiet || git commit -m "Cap nhat du lieu Global %date%"
git push origin main || goto :err
echo == Deploy thu muc site len nhanh gh-pages ==
git subtree split --prefix site -b gh-pages-tmp || goto :err
git push -f origin gh-pages-tmp:gh-pages || goto :err
git branch -D gh-pages-tmp >nul
echo Xong! Trang se cap nhat sau 1-2 phut: https://vihkag.github.io/uma-wiki-vi/
pause
exit /b 0
:err
echo LOI - xem thong bao phia tren.
pause
exit /b 1
