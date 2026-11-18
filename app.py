
import sqlite3
from flask import Flask, request, jsonify
from database import get_db_connection, create_table

app = Flask(__name__)

# Create database tables
create_table()


# =====================================
# 1. HOME API
# =====================================

@app.route("/")
def home():
    return jsonify({
        "message": "Medico Sync EMR API Running",
        "status": "Success"
    })


# =====================================
# 2. PATIENT REGISTRATION API
# =====================================

@app.route("/api/patients", methods=["POST"])
def register_patient():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "status": "Error",
            "message": "JSON data is required"
        }), 400

    name = data.get("patient_name")
    age = data.get("age")
    gender = data.get("gender")
    mobile = data.get("mobile")

    if not all([name, age is not None, gender, mobile]):
        return jsonify({
            "status": "Error",
            "message": "All fields are required"
        }), 400

    if isinstance(age, bool):
        return jsonify({
            "status": "Error",
            "message": "Age must be a number"
        }), 400

    try:
        age = int(age)
    except (ValueError, TypeError):
        return jsonify({
            "status": "Error",
            "message": "Age must be a number"
        }), 400

    if age < 0 or age > 120:
        return jsonify({
            "status": "Error",
            "message": "Enter a valid age"
        }), 400

    name = str(name).strip()
    gender = str(gender).strip()
    mobile = str(mobile).strip()

    if not name or not gender or not mobile:
        return jsonify({
            "status": "Error",
            "message": "Fields cannot be empty"
        }), 400

    if not mobile.isdigit() or len(mobile) != 10:
        return jsonify({
            "status": "Error",
            "message": "Enter a valid 10-digit mobile number"
        }), 400

    conn = get_db_connection()

    try:
        cursor = conn.execute("""
            INSERT INTO patients
            (patient_name, age, gender, mobile)
            VALUES (?, ?, ?, ?)
        """, (name, age, gender, mobile))

        patient_id = cursor.lastrowid
        conn.commit()

        return jsonify({
            "status": "Success",
            "message": "Patient registered successfully",
            "patient_id": patient_id,
            "patient_name": name
        }), 201

    finally:
        conn.close()


# =====================================
# 3. GET ALL PATIENTS API
# =====================================

@app.route("/api/patients", methods=["GET"])
def get_all_patients():

    conn = get_db_connection()

    try:
        rows = conn.execute(
            "SELECT * FROM patients ORDER BY id DESC"
        ).fetchall()

        patients = [dict(row) for row in rows]

        return jsonify({
            "status": "Success",
            "total_patients": len(patients),
            "patients": patients
        }), 200

    finally:
        conn.close()


# =====================================
# 4. GET PATIENT BY ID API
# =====================================

@app.route("/api/patients/<int:patient_id>", methods=["GET"])
def get_patient_by_id(patient_id):

    conn = get_db_connection()

    try:
        patient = conn.execute(
            "SELECT * FROM patients WHERE id = ?",
            (patient_id,)
        ).fetchone()

        if patient is None:
            return jsonify({
                "status": "Error",
                "message": "Patient not found"
            }), 404

        return jsonify({
            "status": "Success",
            "patient": dict(patient)
        }), 200

    finally:
        conn.close()


# =====================================
# 5. UPDATE PATIENT API
# =====================================

@app.route("/api/patients/<int:patient_id>", methods=["PUT"])
def update_patient(patient_id):

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "status": "Error",
            "message": "JSON data is required"
        }), 400

    name = data.get("patient_name")
    age = data.get("age")
    gender = data.get("gender")
    mobile = data.get("mobile")

    if not all([name, age is not None, gender, mobile]):
        return jsonify({
            "status": "Error",
            "message": "All fields are required"
        }), 400

    if isinstance(age, bool):
        return jsonify({
            "status": "Error",
            "message": "Age must be a number"
        }), 400

    try:
        age = int(age)
    except (ValueError, TypeError):
        return jsonify({
            "status": "Error",
            "message": "Age must be a number"
        }), 400

    if age < 0 or age > 120:
        return jsonify({
            "status": "Error",
            "message": "Enter a valid age"
        }), 400

    name = str(name).strip()
    gender = str(gender).strip()
    mobile = str(mobile).strip()

    if not name or not gender or not mobile:
        return jsonify({
            "status": "Error",
            "message": "Fields cannot be empty"
        }), 400

    if not mobile.isdigit() or len(mobile) != 10:
        return jsonify({
            "status": "Error",
            "message": "Enter a valid 10-digit mobile number"
        }), 400

    conn = get_db_connection()

    try:
        patient = conn.execute(
            "SELECT id FROM patients WHERE id = ?",
            (patient_id,)
        ).fetchone()

        if patient is None:
            return jsonify({
                "status": "Error",
                "message": "Patient not found"
            }), 404

        conn.execute("""
            UPDATE patients
            SET patient_name = ?, age = ?, gender = ?, mobile = ?
            WHERE id = ?
        """, (name, age, gender, mobile, patient_id))

        conn.commit()

        return jsonify({
            "status": "Success",
            "message": "Patient updated successfully",
            "patient_id": patient_id
        }), 200

    finally:
        conn.close()


# =====================================
# 6. DELETE PATIENT API
# =====================================

@app.route("/api/patients/<int:patient_id>", methods=["DELETE"])
def delete_patient(patient_id):

    conn = get_db_connection()

    try:
        patient = conn.execute(
            "SELECT id FROM patients WHERE id = ?",
            (patient_id,)
        ).fetchone()

        if patient is None:
            return jsonify({
                "status": "Error",
                "message": "Patient not found"
            }), 404

        # Do not delete a patient who has medical history
        records = conn.execute("""
            SELECT record_id FROM medical_records
            WHERE patient_id = ?
            LIMIT 1
        """, (patient_id,)).fetchone()

        if records:
            return jsonify({
                "status": "Error",
                "message": "Patient has medical records. Delete is restricted to protect medical history."
            }), 409

        conn.execute(
            "DELETE FROM patients WHERE id = ?",
            (patient_id,)
        )

        conn.commit()

        return jsonify({
            "status": "Success",
            "message": "Patient deleted successfully",
            "patient_id": patient_id
        }), 200

    finally:
        conn.close()


# =====================================
# 7. ADD NAMASTE TERM API
# =====================================

@app.route("/api/namaste/terms", methods=["POST"])
def add_namaste_term():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "status": "Error",
            "message": "JSON data is required"
        }), 400

    terminology_code = data.get("terminology_code")
    term_name = data.get("term_name")
    description = data.get("description", "")
    source_system = data.get("source_system", "NAMASTE")
    language = data.get("language", "English")

    if not terminology_code or not term_name:
        return jsonify({
            "status": "Error",
            "message": "Terminology code and term name are required"
        }), 400

    terminology_code = str(terminology_code).strip()
    term_name = str(term_name).strip()

    if not terminology_code or not term_name:
        return jsonify({
            "status": "Error",
            "message": "Fields cannot be empty"
        }), 400

    conn = get_db_connection()

    try:
        cursor = conn.execute("""
            INSERT INTO namaste_terms
            (terminology_code, term_name, description,
             source_system, language)
            VALUES (?, ?, ?, ?, ?)
        """, (
            terminology_code,
            term_name,
            description,
            source_system,
            language
        ))

        term_id = cursor.lastrowid
        conn.commit()

        return jsonify({
            "status": "Success",
            "message": "NAMASTE term added successfully",
            "term_id": term_id,
            "terminology_code": terminology_code,
            "term_name": term_name
        }), 201

    except sqlite3.IntegrityError:
        return jsonify({
            "status": "Error",
            "message": "This terminology code already exists"
        }), 409

    finally:
        conn.close()


# =====================================
# 8. GET ALL NAMASTE TERMS API
# =====================================

@app.route("/api/namaste/terms", methods=["GET"])
def get_namaste_terms():

    conn = get_db_connection()

    try:
        rows = conn.execute("""
            SELECT * FROM namaste_terms
            ORDER BY id DESC
        """).fetchall()

        terms = [dict(row) for row in rows]

        return jsonify({
            "status": "Success",
            "total_terms": len(terms),
            "terms": terms
        }), 200

    finally:
        conn.close()


# =====================================
# 9. SEARCH NAMASTE TERMS API
# =====================================

@app.route("/api/namaste/search", methods=["GET"])
def search_namaste_terms():

    search_query = request.args.get("q", "").strip()

    if not search_query:
        return jsonify({
            "status": "Error",
            "message": "Search query is required. Use ?q=term"
        }), 400

    conn = get_db_connection()

    try:
        rows = conn.execute("""
            SELECT * FROM namaste_terms
            WHERE term_name LIKE ?
            OR terminology_code LIKE ?
            ORDER BY term_name
        """, (
            f"%{search_query}%",
            f"%{search_query}%"
        )).fetchall()

        terms = [dict(row) for row in rows]

        return jsonify({
            "status": "Success",
            "total_results": len(terms),
            "results": terms
        }), 200

    finally:
        conn.close()


# =====================================
# 10. ADD MEDICAL RECORD API
# =====================================

@app.route("/api/medical-records", methods=["POST"])
def add_medical_record():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "status": "Error",
            "message": "JSON data is required"
        }), 400

    patient_id = data.get("patient_id")
    symptoms = data.get("symptoms")

    if patient_id is None or not symptoms:
        return jsonify({
            "status": "Error",
            "message": "Patient ID and symptoms are required"
        }), 400

    try:
        patient_id = int(patient_id)
    except (ValueError, TypeError):
        return jsonify({
            "status": "Error",
            "message": "Patient ID must be a number"
        }), 400

    symptoms = str(symptoms).strip()

    if patient_id <= 0 or not symptoms:
        return jsonify({
            "status": "Error",
            "message": "Enter valid patient ID and symptoms"
        }), 400

    diagnosis = data.get("diagnosis", "")
    treatment = data.get("treatment", "")
    prescription = data.get("prescription", "")
    doctor_name = data.get("doctor_name", "")
    notes = data.get("notes", "")

    conn = get_db_connection()

    try:
        patient = conn.execute(
            "SELECT id FROM patients WHERE id = ?",
            (patient_id,)
        ).fetchone()

        if patient is None:
            return jsonify({
                "status": "Error",
                "message": "Patient not found"
            }), 404

        cursor = conn.execute("""
            INSERT INTO medical_records
            (patient_id, symptoms, diagnosis, treatment,
             prescription, doctor_name, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            patient_id,
            symptoms,
            diagnosis,
            treatment,
            prescription,
            doctor_name,
            notes
        ))

        record_id = cursor.lastrowid
        conn.commit()

        return jsonify({
            "status": "Success",
            "message": "Medical record added successfully",
            "record_id": record_id,
            "patient_id": patient_id
        }), 201

    finally:
        conn.close()


# =====================================
# 11. GET PATIENT MEDICAL HISTORY API
# =====================================

@app.route(
    "/api/patients/<int:patient_id>/medical-records",
    methods=["GET"]
)
def get_patient_medical_records(patient_id):

    conn = get_db_connection()

    try:
        patient = conn.execute(
            "SELECT id, patient_name FROM patients WHERE id = ?",
            (patient_id,)
        ).fetchone()

        if patient is None:
            return jsonify({
                "status": "Error",
                "message": "Patient not found"
            }), 404

        rows = conn.execute("""
            SELECT * FROM medical_records
            WHERE patient_id = ?
            ORDER BY record_id DESC
        """, (patient_id,)).fetchall()

        records = [dict(row) for row in rows]

        return jsonify({
            "status": "Success",
            "patient_id": patient_id,
            "patient_name": patient["patient_name"],
            "total_records": len(records),
            "medical_records": records
        }), 200

    finally:
        conn.close()


# =====================================
# 12. GET ALL MEDICAL RECORDS API
# =====================================

@app.route("/api/medical-records", methods=["GET"])
def get_all_medical_records():

    conn = get_db_connection()

    try:
        rows = conn.execute("""
            SELECT
                medical_records.*,
                patients.patient_name
            FROM medical_records
            INNER JOIN patients
            ON medical_records.patient_id = patients.id
            ORDER BY medical_records.record_id DESC
        """).fetchall()

        records = [dict(row) for row in rows]

        return jsonify({
            "status": "Success",
            "total_records": len(records),
            "medical_records": records
        }), 200

    finally:
        conn.close()



# =====================================
# 13. UPDATE MEDICAL RECORD API
# =====================================

@app.route("/api/medical-records/<int:record_id>", methods=["PUT", "PATCH"])
def update_medical_record(record_id):

    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({
            "status": "Error",
            "message": "A non-empty JSON object is required"
        }), 400

    allowed_fields = {
        "symptoms", "diagnosis", "treatment",
        "prescription", "doctor_name", "notes"
    }

    unknown_fields = set(data.keys()) - allowed_fields

    if unknown_fields:
        return jsonify({
            "status": "Error",
            "message": "Unknown field(s): " + ", ".join(sorted(unknown_fields))
        }), 400

    if "symptoms" in data:
        if data["symptoms"] is None or not str(data["symptoms"]).strip():
            return jsonify({
                "status": "Error",
                "message": "Symptoms cannot be empty"
            }), 400

    conn = get_db_connection()

    try:
        record = conn.execute(
            "SELECT * FROM medical_records WHERE record_id = ?",
            (record_id,)
        ).fetchone()

        if record is None:
            return jsonify({
                "status": "Error",
                "message": "Medical record not found"
            }), 404

        # Keep existing values for fields not supplied in the request.
        values = {}
        for field in allowed_fields:
            if field in data:
                value = data[field]
                values[field] = (
                    str(value).strip()
                    if value is not None and field in {"symptoms", "diagnosis",
                                                       "treatment", "prescription",
                                                       "doctor_name", "notes"}
                    else ""
                )
            else:
                values[field] = record[field]

        conn.execute("""
            UPDATE medical_records
            SET symptoms = ?,
                diagnosis = ?,
                treatment = ?,
                prescription = ?,
                doctor_name = ?,
                notes = ?
            WHERE record_id = ?
        """, (
            values["symptoms"],
            values["diagnosis"],
            values["treatment"],
            values["prescription"],
            values["doctor_name"],
            values["notes"],
            record_id
        ))

        conn.commit()

        return jsonify({
            "status": "Success",
            "message": "Medical record updated successfully",
            "record_id": record_id
        }), 200

    except sqlite3.Error as error:
        conn.rollback()
        return jsonify({
            "status": "Error",
            "message": "Database operation failed"
        }), 500

    finally:
        conn.close()


# =====================================
# 14. DELETE MEDICAL RECORD API
# =====================================

@app.route("/api/medical-records/<int:record_id>", methods=["DELETE"])
def delete_medical_record(record_id):

    conn = get_db_connection()

    try:
        record = conn.execute(
            "SELECT record_id FROM medical_records WHERE record_id = ?",
            (record_id,)
        ).fetchone()

        if record is None:
            return jsonify({
                "status": "Error",
                "message": "Medical record not found"
            }), 404

        conn.execute(
            "DELETE FROM medical_records WHERE record_id = ?",
            (record_id,)
        )

        conn.commit()

        return jsonify({
            "status": "Success",
            "message": "Medical record deleted successfully",
            "record_id": record_id
        }), 200

    finally:
        conn.close()


# =====================================
# RUN FLASK SERVER
# =====================================

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
