# Uma Wiki VI

Trang web tĩnh tra cứu Support Card, Kỹ năng và lịch Champions Meeting của **Umamusume: Pretty Derby bản Global**, có bản dịch tiếng Việt.

## Xem trang
- Online: https://vihkag.github.io/uma-wiki-vi/
- Offline: mở `site/index.html` bằng trình duyệt. Không cần server.

## Deploy
Nhấp đúp `deploy.bat`. Script sẽ cập nhật dữ liệu, commit, push lên `main`, rồi đẩy thư mục `site/` sang nhánh `gh-pages`. GitHub Pages phục vụ trang từ nhánh `gh-pages`, và trang thay đổi sau 1–2 phút.

Workflow `.github/workflows/deploy.yml` (tự cập nhật hằng ngày) chỉ chạy khi GitHub Actions của tài khoản hoạt động bình thường. Nếu dùng workflow, nhớ chuyển Settings → Pages → Source sang "GitHub Actions".

## Cập nhật khi Global ra bản mới
Yêu cầu Node.js 18 trở lên.

```
node scripts/update.mjs        # hoặc nhấp đúp cap-nhat.bat
```

Script sẽ:
1. Tải dữ liệu mới nhất từ GameTora. Chỉ lấy card có ngày ra mắt Global và kỹ năng đã có ở Global.
2. Cập nhật lịch Champions Meeting gồm kỳ đang diễn ra và 2 kỳ sắp tới. Ngày dự kiến lấy theo dự đoán của GameTora, thông số đường đua lấy từ kỳ tương ứng ở bản Nhật, kèm sơ đồ đường đua và kỹ năng phù hợp.
3. Tải icon kỹ năng và ảnh card còn thiếu vào `site/img/`.
4. Ghép bản dịch tiếng Việt rồi ghi ra `site/data/data.js`.
5. Liệt kê kỹ năng mới chưa có bản dịch vào `i18n/missing-skills.json`. Trên web, các kỹ năng này hiện tiếng Anh kèm nhãn "Chưa dịch".

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
