from database import get_db_connection

conn = get_db_connection()

cursor = conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table'"
)

tables = cursor.fetchall()

print("Database Tables:")

for table in tables:
    print(table["name"])

conn.close()