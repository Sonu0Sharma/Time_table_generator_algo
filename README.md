# TimeWise — Automated Timetable Generation Algorithm

A constraint-aware automated academic scheduling engine built with Flask, Pandas, and FPDF2 to generate conflict-free timetables across courses, faculty, and classrooms.

<p align="center">
  <img src="https://img.shields.io/badge/status-stable-brightgreen" alt="Status" />
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/Python-3.12-blue" alt="Python Version" />
  <img src="https://img.shields.io/badge/Flask-3.0.3-000000" alt="Flask" />
  <img src="https://img.shields.io/badge/SQLite-3-003B57" alt="SQLite" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

| [💻 GitHub Repository](https://github.com/Sonu0Sharma/Time_table_generator_algo) |
|---|

<p align="center">
  <img src="./docs/timewise_logo.png" alt="TimeWise Logo" width="340" />
</p>

## Table of Contents

- [Motivation](#motivation)
- [Background](#background)
- [Problem Formulation](#problem-formulation)
- [Our Work / Key Features](#our-work--key-features)
- [Future Scope](#future-scope)
- [Ideation & Architectural Thinking](#ideation--architectural-thinking)
- [Technologies](#technologies)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)
- [Author & Support](#-author--support)

---

## Motivation

During my college semesters, I observed administrative coordinators manually spending weeks drafting weekly timetables across multiple departments. Adjusting faculty preferences and room allocations by hand frequently led to double-bookings and suboptimal schedules. I built TimeWise to test whether constraint validation and randomized iterative placement could automate timetable synthesis in seconds while guaranteeing zero room and faculty collisions.

## Background

University timetabling is an NP-hard combinatorial optimization challenge where constraints grow factorially with every additional course, instructor, and classroom. In typical institutions, multiple branches share limited infrastructure and cross-departmental professors, turning schedule planning into an error-prone task. Manual scheduling often fails to balance faculty workload or enforce institution-wide requirements such as designated lunch slots. Automated scheduling software minimizes administrative overhead while ensuring consistent constraint adherence.

## Problem Formulation

From this institutional context, I defined the scheduling objective as a multi-constraint allocation problem across time slots ($T$), weekdays ($D$), classrooms ($R$), faculty ($F$), and course-branch assignments ($C$). 

The engine ingests three input datasets and enforces four non-negotiable hard constraints:
- **Courses Input** (`final_courses.csv`): Departmental branch mapping and assigned subjects.
- **Faculty Input** (`final_faculty.csv`): Instructor availability and multi-column subject preferences.
- **Rooms Input** (`final_rooms.csv`): Eligible lecture halls and laboratory spaces.

**Hard Constraints Enforced:**
- No instructor assigned to multiple classrooms simultaneously.
- No classroom occupied by multiple branches in the same time slot.
- Exactly one scheduled session per branch per time slot.
- Preservation of a dedicated lunch interval (`13:00 - 14:00`) whenever a branch curriculum exceeds 3 classes in a day.

## Our Work / Key Features

I developed TimeWise as a modular web application that parses raw institutional CSV data and executes constraint-based schedule generation with multi-scenario outputs and document exports.

- ✅ **Multi-Scenario Generation**: Produces 3 distinct timetable candidates per run so administrators can choose the optimal balance.
- ✅ **Conflict-Free Allocation Engine**: Validates room availability and instructor bookings in real time to prevent collisions.
- ✅ **Dynamic Faculty Preference Parsing**: Ingests variable instructor subject preference columns via Pandas melting.
- ✅ **Automated Lunch Slot Reservation**: Dynamically locks `13:00 - 14:00` for lunch whenever a branch exceeds 3 classes in a day.
- ✅ **Vector PDF Timetable Export**: Generates clean, landscape A4 PDF schedules with multi-cell auto-wrapping via FPDF2.
- ✅ **Multi-Sheet Excel Export**: Exports formatted `.xlsx` workbooks categorized branch-by-branch using OpenPyXL.
- ✅ **Secure Administrator Authentication**: RESTful login and signup secured by PBKDF2:SHA-256 hashed credentials.

## Future Scope

- Support for lab sessions spanning consecutive multi-hour slots with specialized lab room requirements.
- Genetic algorithm (GA) optimization with soft constraint weights (e.g., minimizing faculty idle gaps).
- Role-based views allowing students and faculty to view their individualized weekly schedules.
- Calendar integration with iCal and Google Calendar sync.

Contributions and suggestions for the above are welcome — see [Contributing](#contributing).

---

## Ideation & Architectural Thinking

- **Randomized Allocation with Collision Maps**: Instead of naive brute-force backtracking that risks combinatorial explosions on dense datasets, I used randomized iteration tracked by in-memory hash sets (`faculty_bookings` and `room_bookings`), allowing O(1) conflict lookups per candidate slot.
- **In-Memory Streaming for Exports**: Rather than writing temporary PDF and Excel files to local disk and managing file cleanup, all exports are compiled in-memory via Python `BytesIO` buffers and streamed directly to HTTP responses.
- **Modular Blueprint Architecture**: Segregated routing into distinct Flask Blueprints (`auth` and `main`) to isolate user authentication logic from the core CSV ingestion and computational scheduling pipeline.

## Technologies

- **Backend Framework**: Python 3.12, Flask 3.0.3, Flask-SQLAlchemy 3.1.1, Flask-Login 0.6.3, Werkzeug 3.0.3
- **Data Processing & Algorithms**: Pandas 2.3.2, NumPy 2.3.3
- **Document Generation**: FPDF2 2.8.4, OpenPyXL 3.1.5
- **Database**: SQLite 3 via SQLAlchemy ORM
- **Frontend**: HTML5, Vanilla CSS3, JavaScript (Fetch API)

## Repository Structure

```
.
├── docs/                   # Documentation assets and visuals
│   └── timewise_logo.png   # Project branding asset
├── instance/               # Local SQLite database (gitignored)
├── timetable_app/          # Core application package
│   ├── static/             # Frontend static files (CSS, JS, assets)
│   ├── templates/          # Jinja2 HTML templates
│   ├── __init__.py         # Flask app factory and DB initialization
│   ├── auth.py             # Authentication blueprint and API routes
│   ├── main.py             # Scheduling algorithm, API, and export logic
│   └── models.py           # SQLAlchemy database models
├── final_courses.csv       # Sample course input dataset
├── final_faculty.csv       # Sample faculty preferences dataset
├── final_rooms.csv         # Sample classroom capacity dataset
├── requirements.txt        # Python dependency manifest
├── run.py                  # Application entry point
├── .gitignore              # Git ignore rules
├── LICENSE                 # MIT License
└── README.md               # Project documentation
```

## Getting Started

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- pip and virtualenv

### Installation & Execution

```bash
# Clone the repository
git clone https://github.com/Sonu0Sharma/Time_table_generator_algo.git
cd Time_table_generator_algo

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the Flask development server
python run.py
```

Access the web interface at `http://127.0.0.1:5000`. Upload your CSV files (`courses_file`, `faculty_file`, `rooms_file`) to generate conflict-free schedules and download them in PDF or Excel format.

## Contributing

Suggestions and improvements are welcome. Please open an issue to discuss proposed changes before submitting a pull request.

## License

This project is licensed under the [MIT License](./LICENSE).

---

## 👨‍💻 Author & Support

**Sonu Sharma**  
Software Developer & Student

- 📧 Email: [sonusharma15772@gmail.com](mailto:sonusharma15772@gmail.com)
- 💻 GitHub: [github.com/Sonu0Sharma](https://github.com/Sonu0Sharma)
- 💼 LinkedIn: [linkedin.com/in/sonu0sharma](https://linkedin.com/in/sonu0sharma)

If you found this useful, a ⭐ on GitHub is appreciated.
