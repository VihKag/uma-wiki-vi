# Uma Wiki VI

Trang web tĩnh tra cứu Support Card và Kỹ năng của **Umamusume: Pretty Derby bản Global**, có bản dịch tiếng Việt.

## Xem trang
Mở `site/index.html` bằng trình duyệt. Không cần server.
Muốn đưa lên mạng thì upload nguyên thư mục `site/` lên GitHub Pages, Netlify hoặc Cloudflare Pages.

## Cập nhật khi Global ra bản mới
Yêu cầu Node.js 18 trở lên.

```
node scripts/update.mjs        # hoặc nhấp đúp cap-nhat.bat
```

Script sẽ:
1. Tải dữ liệu mới nhất từ GameTora. Chỉ lấy card có ngày ra mắt Global và kỹ năng đã có ở Global.
2. Tải icon kỹ năng và ảnh card còn thiếu vào `site/img/`.
3. Ghép bản dịch tiếng Việt rồi ghi ra `site/data/data.js`.
4. Liệt kê kỹ năng mới chưa có bản dịch vào `i18n/missing-skills.json`. Trên web, các kỹ năng này hiện tiếng Anh kèm nhãn "Chưa dịch".

### Dịch kỹ năng mới
Thêm vào `i18n/vi-skills.json` theo dạng:
```json
"200512": { "name": "Tăng tốc về đích", "desc": "Tăng nhẹ tốc độ trong nước rút cuối." }
```
Sau đó chạy `node scripts/update.mjs --offline` để build lại mà không tải gì.
Có thể nhờ Claude: *"dịch i18n/missing-skills.json theo i18n/GLOSSARY.md rồi gộp vào i18n/vi-skills.json"*.

## Cấu trúc
| Đường dẫn | Nội dung |
|---|---|
| `scripts/update.mjs` | Tải dữ liệu, lọc bản Global, tải ảnh, build |
| `i18n/vi-skills.json` | Bản dịch kỹ năng (theo ID) |
| `i18n/vi-base.json` | Bản dịch hiệu ứng card, nhãn, tag |
| `i18n/GLOSSARY.md` | Bảng thuật ngữ để dịch thống nhất |
| `raw/` | Dữ liệu gốc đã tải (bộ nhớ đệm) |
| `site/` | Trang web hoàn chỉnh |

Dữ liệu và hình ảnh lấy từ GameTora; Umamusume © Cygames. Đây là trang do người hâm mộ tự làm.
