import re
import uuid

def create_mopeds_variants():
    with open('mopeds_rows.sql', 'r', encoding='utf-8') as f:
        content = f.read()

    match = re.search(r'INSERT INTO "public"\."mopeds" \([^)]+\) VALUES\s*(.*);', content, re.DOTALL | re.IGNORECASE)
    if not match: return

    values_part = match.group(1).strip()
    records = []
    i = 0
    while i < len(values_part):
        if values_part[i] == '(':
            i += 1
            record_values = []
            while i < len(values_part) and values_part[i] != ')':
                while i < len(values_part) and values_part[i] in ' \n\r\t': i += 1
                if values_part[i] == "'":
                    start = i
                    i += 1
                    while i < len(values_part):
                        if values_part[i] == "'" and (i + 1 == len(values_part) or values_part[i+1] != "'"): break
                        if values_part[i] == "'" and i + 1 < len(values_part) and values_part[i+1] == "'": i += 1 
                        i += 1
                    i += 1
                    record_values.append(values_part[start:i])
                elif values_part[i:i+4].lower() == 'null':
                    record_values.append('NULL')
                    i += 4
                else:
                    start = i
                    while i < len(values_part) and values_part[i] not in ',)': i += 1
                    record_values.append(values_part[start:i].strip())
                while i < len(values_part) and values_part[i] in ' \n\r\t': i += 1
                if i < len(values_part) and values_part[i] == ',': i += 1
            if i < len(values_part) and values_part[i] == ')':
                records.append(record_values)
                i += 1
            while i < len(values_part) and values_part[i] in ' \n\r\t,': i += 1
        else: i += 1

    # 1. Version WITHOUT images (Ultra light)
    with open('all_mopeds_no_images.sql', 'w', encoding='utf-8') as f:
        f.write("-- Light import (No images) - Works everywhere\n")
        f.write("INSERT INTO vehicles (id, company_id, name, plate, image, status, color, vin, tech_passport, tariffs)\nVALUES\n")
        rows = []
        for r in records:
            if len(r) < 15: continue
            # Use original ID if it looks like a UUID, otherwise generate one
            orig_id = r[0].strip("'")
            if len(orig_id) < 10: # Probably not a UUID
                v_id = f"'{str(uuid.uuid4())}'"
            else:
                v_id = r[0]
                
            b = r[1].strip("'")
            m = r[2].strip("'")
            name = f"'{b} {m}'"
            status = r[5] if r[5].strip("'") in ['available', 'rented', 'maintenance'] else "'available'"
            rows.append(f"({v_id}, 'scoots', {name}, {r[3]}, '', {status}, {r[10]}, {r[9]}, {r[8]}, '[]'::jsonb)")
        f.write(",\n".join(rows) + ";")

    # 2. Batched Version (With images)
    with open('all_mopeds_batched.sql', 'w', encoding='utf-8') as f:
        f.write("-- Batched import (With images) - Run these chunks one by one if too large\n")
        batch_size = 10
        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            f.write(f"-- Batch {i//batch_size + 1}\n")
            f.write("INSERT INTO vehicles (id, company_id, name, plate, image, status, color, vin, tech_passport, tariffs)\nVALUES\n")
            rows = []
            for r in batch:
                if len(r) < 15: continue
                orig_id = r[0].strip("'")
                if len(orig_id) < 10:
                    v_id = f"'{str(uuid.uuid4())}'"
                else:
                    v_id = r[0]
                    
                b = r[1].strip("'")
                m = r[2].strip("'")
                name = f"'{b} {m}'"
                image = r[4]
                status = r[5] if r[5].strip("'") in ['available', 'rented', 'maintenance'] else "'available'"
                rows.append(f"({v_id}, 'scoots', {name}, {r[3]}, {image}, {status}, {r[10]}, {r[9]}, {r[8]}, '[]'::jsonb)")
            f.write(",\n".join(rows) + ";\n\n")

if __name__ == "__main__":
    create_mopeds_variants()
