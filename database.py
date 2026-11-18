
import sqlite3
import os


# =====================================
# 1. DATABASE FILE PATH
# =====================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "emr.db")


# =====================================
# 2. DATABASE CONNECTION
# =====================================

def get_db_connection():

    conn = sqlite3.connect(DB_PATH)

    conn.row_factory = sqlite3.Row

    # Enable foreign key support
    conn.execute("PRAGMA foreign_keys = ON")

    return conn


# =====================================
# 3. CREATE DATABASE TABLES
# =====================================

def create_table():

    conn = get_db_connection()

    try:

        # --------------------------------
        # PATIENT TABLE
        # --------------------------------

        conn.execute("""
            CREATE TABLE IF NOT EXISTS patients (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                patient_name TEXT NOT NULL,

                age INTEGER NOT NULL,

                gender TEXT NOT NULL,

                mobile TEXT NOT NULL

            )
        """)

        # --------------------------------
        # NAMASTE TERMINOLOGY TABLE
        # --------------------------------

        conn.execute("""
            CREATE TABLE IF NOT EXISTS namaste_terms (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                terminology_code TEXT UNIQUE,

                term_name TEXT NOT NULL,

                description TEXT,

                source_system TEXT DEFAULT 'NAMASTE',

                language TEXT DEFAULT 'English'

            )
        """)

        # --------------------------------
        # EMR MEDICAL RECORDS TABLE
        # --------------------------------

        conn.execute("""
            CREATE TABLE IF NOT EXISTS medical_records (

                record_id INTEGER PRIMARY KEY AUTOINCREMENT,

                patient_id INTEGER NOT NULL,

                symptoms TEXT NOT NULL,

                diagnosis TEXT,

                treatment TEXT,

                prescription TEXT,

                doctor_name TEXT,

                visit_date TEXT DEFAULT CURRENT_TIMESTAMP,

                notes TEXT,

                FOREIGN KEY (patient_id)

                REFERENCES patients(id)

                ON DELETE RESTRICT

            )
        """)

        conn.commit()

        print("Database tables created successfully!")

    except sqlite3.Error as error:

        conn.rollback()

        print("Database Error:", error)

        raise

    finally:

        conn.close()


# =====================================
# 4. CHECK DATABASE TABLES
# =====================================

def check_tables():

    conn = get_db_connection()

    try:

        cursor = conn.execute("""
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            ORDER BY name
        """)

        tables = cursor.fetchall()

        print("\nDatabase Tables:")

        for table in tables:

            print("-", table["name"])

    except sqlite3.Error as error:

        print("Database Check Error:", error)

        raise

    finally:

        conn.close()


# =====================================
# 5. RUN DATABASE
# =====================================

if __name__ == "__main__":

    create_table()

    check_tables()

    print("\nMedico.Sync EMR Database Ready!")
