import os
import re
import ast

def get_actual_categories(structure_file):
    with open(structure_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract CATEGORIES object. This is a bit simplistic but should work for this file structure.
    match = re.search(r'export const CATEGORIES = ({[\s\S]*?});', content)
    if not match:
        return {}
    
    # Use python dictionary to parse it
    obj_str = match.group(1)
    
    # This is a bit hacky, replacing TS syntax with Python
    # e.g., "العلوم والطبيعة": { topics: [...] }
    # To parse it as Python dict, we can change it to valid Python strings.
    # Actually, a simpler way is just to manually parse it.
    
    categories = {}
    main_cats = re.findall(r'"([^"]+)":\s*{', obj_str)
    for cat in main_cats:
        topics_match = re.search(r'"' + cat + r'":\s*{\s*topics:\s*\[(.*?)\]', obj_str, re.DOTALL)
        if topics_match:
            topics = [t.strip().strip('"') for t in topics_match.group(1).split(',')]
            categories[cat] = topics
    return categories

def check_files():
    data_dir = 'src/data'
    category_structure = get_actual_categories(os.path.join(data_dir, 'categoryStructure.ts'))
    
    valid_topics = []
    for topics in category_structure.values():
        valid_topics.extend(topics)
    
    seen_ids = set()
    
    for filename in os.listdir(data_dir):
        if filename.endswith('.ts') and filename not in ['categoryStructure.ts', 'localBank.ts']:
            filepath = os.path.join(data_dir, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Extract questions (simplistic)
            questions = re.findall(r'\{ id:.*?category:.*?\'([^\']*)\'.*?\}', content, re.DOTALL)
            
            # Extract IDs for duplicates
            ids = re.findall(r'id:\s*\'([^\']*)\'', content)
            for id_val in ids:
                if id_val in seen_ids:
                    print(f"Duplicate ID found: {id_val} in {filename}")
                seen_ids.add(id_val)
                
            # Extract categories and check
            categories = re.findall(r'category:\s*\'([^\']*)\'', content)
            for cat in categories:
                if cat not in valid_topics:
                    print(f"Invalid category found: {cat} in {filename}")

check_files()
