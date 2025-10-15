import re
from collections import OrderedDict

def parse_css_file(file_path):
    # Dictionary to store selectors and their properties
    css_rules = OrderedDict()
    
    # Read the file content
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()

    # Remove single-line comments
    content = re.sub(r'//.*?\n', '\n', content)
    
    # Remove multi-line comments
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)

    # Split into rules while preserving @media queries
    in_media_query = False
    current_media_query = ''
    current_selector = ''
    current_properties = {}
    bracket_count = 0

    # Split content into lines and process
    lines = content.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Handle @media queries
        if '@media' in line:
            in_media_query = True
            current_media_query = line
            bracket_count = line.count('{') - line.count('}')
            continue

        if in_media_query:
            bracket_count += line.count('{') - line.count('}')
            if bracket_count == 0:
                in_media_query = False
                current_media_query = ''
            continue

        # Check if line starts a new rule
        if '{' in line:
            selector = line.split('{')[0].strip()
            current_selector = selector
            current_properties = css_rules.get(selector, OrderedDict())
            continue

        # Check if line ends a rule
        if '}' in line:
            if current_selector:
                css_rules[current_selector] = current_properties
                current_selector = ''
                current_properties = {}
            continue

        # Process properties
        if ':' in line and current_selector:
            # Remove trailing semicolon and split into property and value
            line = line.rstrip(';')
            prop, val = line.split(':', 1)
            prop = prop.strip()
            val = val.strip()
            current_properties[prop] = val

    return css_rules

def write_consolidated_css(css_rules, output_file):
    with open(output_file, 'w', encoding='utf-8') as file:
        for selector, properties in css_rules.items():
            file.write(f'{selector} {{\n')
            for prop, value in properties.items():
                file.write(f'    {prop}: {value};\n')
            file.write('}\n\n')

def consolidate_css(input_file, output_file):
    try:
        # Parse and consolidate CSS rules
        css_rules = parse_css_file(input_file)
        
        # Write consolidated CSS to new file
        write_consolidated_css(css_rules, output_file)
        
        # Calculate statistics
        original_size = len(open(input_file, 'r', encoding='utf-8').read())
        consolidated_size = len(open(output_file, 'r', encoding='utf-8').read())
        size_reduction = original_size - consolidated_size
        
        print(f"CSS consolidation complete!")
        print(f"Original file size: {original_size} bytes")
        print(f"Consolidated file size: {consolidated_size} bytes")
        print(f"Size reduction: {size_reduction} bytes ({(size_reduction/original_size)*100:.2f}%)")
        
    except Exception as e:
        print(f"Error during CSS consolidation: {str(e)}")

if __name__ == "__main__":
    input_file = "styles.css"
    output_file = "styles.consolidated.css"
    consolidate_css(input_file, output_file)