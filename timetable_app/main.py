from flask import Blueprint, render_template, request, jsonify, send_file
import pandas as pd
import random
from fpdf import FPDF
from io import BytesIO

main = Blueprint('main', __name__)

# --- Constants for timetable structure ---
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
TIME_SLOTS = [
    "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00",
    "13:00 - 14:00", # Lunch Slot
    "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00"
]

def generate_schedules(courses_df, faculty_df, rooms_df):
    """
    This function contains the core logic for generating three timetable options.
    It creates a grid-like structure for each branch.
    """
    generated_timetables = {}
    
    for i in range(1, 4): # Generate 3 options
        timetable_grid = {}
        faculty_bookings = {f: [] for f in faculty_df['faculty_name'].unique()}
        room_bookings = {r: [] for r in rooms_df['room_name'].unique()}
        courses_to_schedule = courses_df.sample(frac=1).reset_index(drop=True)

        for _, course in courses_to_schedule.iterrows():
            branch = course['branch']
            subject = course['subject']

            if branch not in timetable_grid:
                timetable_grid[branch] = {day: {slot: None for slot in TIME_SLOTS} for day in DAYS}

            possible_faculty = faculty_df[faculty_df['subject'] == subject]['faculty_name'].tolist()
            if not possible_faculty: continue
            
            faculty_name = random.choice(possible_faculty)
            
            scheduled = False
            attempts = 0
            while not scheduled and attempts < 100:
                day = random.choice(DAYS)
                slot = random.choice([s for s in TIME_SLOTS if s != "13:00 - 14:00"])
                room = random.choice(rooms_df['room_name'].tolist())
                
                faculty_slot_key = f"{day}-{slot}"
                room_slot_key = f"{day}-{slot}"
                
                if timetable_grid[branch][day][slot] is None and \
                   faculty_slot_key not in faculty_bookings[faculty_name] and \
                   room_slot_key not in room_bookings[room]:
                    
                    timetable_grid[branch][day][slot] = { "subject": subject, "faculty": faculty_name, "room": room }
                    faculty_bookings[faculty_name].append(faculty_slot_key)
                    room_bookings[room].append(room_slot_key)
                    scheduled = True
                attempts += 1
        
        for branch in timetable_grid:
            for day in DAYS:
                class_count = sum(1 for slot in TIME_SLOTS if timetable_grid[branch][day][slot] is not None)
                if class_count >= 4:
                    timetable_grid[branch][day]["13:00 - 14:00"] = {"subject": "LUNCH BREAK"}

        generated_timetables[f"option{i}"] = timetable_grid
        
    return generated_timetables


@main.route('/')
def index():
    """ Renders the main HTML page. """
    return render_template('index.html')

@main.route('/api/generate', methods=['POST'])
def generate_timetable():
    """ Handles file uploads, data processing, and calls the generation logic. """
    if 'courses_file' not in request.files or 'faculty_file' not in request.files or 'rooms_file' not in request.files:
        return jsonify({"message": "Missing one or more files"}), 400
    try:
        courses_df = pd.read_csv(request.files['courses_file'])
        faculty_df_raw = pd.read_csv(request.files['faculty_file'])
        rooms_df = pd.read_csv(request.files['rooms_file'])

        pref_cols = [col for col in faculty_df_raw.columns if 'subject_preference' in col]
        faculty_df = pd.melt(faculty_df_raw, id_vars=['faculty_name'], value_vars=pref_cols, value_name='subject').dropna(subset=['subject'])
        faculty_df = faculty_df[['faculty_name', 'subject']]
        
        if not {'branch', 'subject'}.issubset(courses_df.columns): 
            return jsonify({"message": "Courses CSV must have 'branch' and 'subject' columns"}), 400
        
        if not {'faculty_name', 'subject'}.issubset(faculty_df.columns): 
            return jsonify({"message": "Faculty CSV is not in the correct format"}), 400
        if 'room_name' not in rooms_df.columns: 
            return jsonify({"message": "Rooms CSV must have a 'room_name' column"}), 400
    except Exception as e:
        return jsonify({"message": f"Error parsing or processing CSV files: {e}"}), 400
    
    timetables = generate_schedules(courses_df, faculty_df, rooms_df)
    return jsonify(timetables), 200

@main.route('/api/export', methods=['POST'])
def export_timetable():
    """ Handles exporting the timetable to either PDF or Excel format. """
    try:
        data = request.get_json()
        export_format = data.get('format')
        timetable_data = data.get('timetable')
        
        if not all([export_format, timetable_data]):
            return jsonify({"message": "Missing format or timetable data"}), 400

        buffer = BytesIO()

        if export_format == 'excel':
            # This part for Excel is correct and unchanged.
            with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
                for branch, grid in timetable_data.items():
                    df = pd.DataFrame(grid).reindex(TIME_SLOTS)
                    df = df[DAYS]
                    df.to_excel(writer, sheet_name=branch)
            
            buffer.seek(0)
            return send_file(
                buffer, as_attachment=True, download_name='timetable.xlsx',
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )

        elif export_format == 'pdf':
            # The PDF generation logic is correct up to the final output line.
            pdf = FPDF(orientation='L', unit='mm', format='A4')
            pdf.set_auto_page_break(auto=True, margin=10)
            
            for branch, grid in timetable_data.items():
                pdf.add_page()
                pdf.set_font('Arial', 'B', 16)
                pdf.cell(0, 10, f'Timetable for {branch}', 0, 1, 'C')
                
                pdf.set_font('Arial', 'B', 9)
                
                col_width = (pdf.w - 20) / (len(DAYS) + 1)
                line_height = 5
                header_height = 10

                pdf.cell(col_width, header_height, 'Time', 1, 0, 'C')
                for day in DAYS:
                    pdf.cell(col_width, header_height, day, 1, 0, 'C')
                pdf.ln(header_height)

                for slot in TIME_SLOTS:
                    pdf.set_font('Arial', 'B', 8)
                    y1 = pdf.get_y()
                    pdf.multi_cell(col_width, line_height, slot, 1, 'C')
                    y2 = pdf.get_y()
                    row_height = y2 - y1
                    pdf.set_y(y1)
                    pdf.set_x(10 + col_width)
                    
                    pdf.set_font('Arial', '', 8)
                    for day in DAYS:
                        cell_data = grid.get(day, {}).get(slot)
                        if cell_data:
                            text = f"{cell_data.get('subject', '')}\n{cell_data.get('faculty', '')}\n{cell_data.get('room', '')}"
                            pdf.multi_cell(col_width, line_height, text.strip(), 1, 'C')
                        else:
                            pdf.multi_cell(col_width, row_height, '', 1, 'C')
                        
                        pdf.set_y(y1)
                        pdf.set_x(pdf.get_x() + col_width)
                    pdf.ln(row_height)

            # --- THIS IS THE FIX ---
            # The pdf.output(dest='S') method returns a bytearray.
            # We must pass this directly to BytesIO.
            # The previous .encode('latin-1') was incorrect and caused the crash.
            buffer = BytesIO(pdf.output(dest='S'))
            buffer.seek(0)
            return send_file(
                buffer, as_attachment=True, download_name='timetable.pdf',
                mimetype='application/pdf'
            )

        return jsonify({"message": "Invalid format requested"}), 400

    except Exception as e:
        # This will now print the specific error to your terminal for debugging
        print(f"FATAL EXPORT ERROR: {e}")
        return jsonify({"message": f"A critical server error occurred: {str(e)}"}), 500