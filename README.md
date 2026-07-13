# Faculty Course Preference & Allotment Studio — V1.4 Development

A preference-aware theory course allotment system developed under **Falcon Bakes**, Department of CSE, School of Computer Science and Technology, Faculty of Engineering and Technology, GM University, Davanagere.

## Credits

**Faculty In-Charge:** Sumana, Pooja Bidri, and Ranjitha J.

The application supports faculty preference collection, course-demand analytics and an interactive HoD allotment workbench. V1.4 is designed as a safe additive upgrade over the deployed V1.3 system.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run db:setup
npm run dev
```

Open `http://localhost:3000`.

## V1.4 feature

Open `/hod/strategy` using the HoD account. The workbench contains:

1. Interactive course allotment board with P1–P6 candidates.
2. Institute- and semester-wise progressive load monitor.
3. Faculty-wise allotted-subject view.
4. Timetable-friendly CSV export.

No existing preference record is modified by the allotment workbench.

## Documentation

See the `docs/` folder, especially:

- `ARCHITECTURE.md`
- `DATABASE.md`
- `DEVELOPER_GUIDE.md`
- `UPGRADE_V1_3_TO_V1_4.md`
- `TESTING_CHECKLIST.md`
- `TROUBLESHOOTING.md`
