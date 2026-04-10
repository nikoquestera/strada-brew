import os

def generate_index_files():
    base_dir = 'src/lib/accurate/endpoints'
    
    # Generate index.ts for each subdirectory
    for root, dirs, files in os.walk(base_dir):
        if root == base_dir:
            continue
        
        index_lines = []
        for file in sorted(files):
            if file.endswith('.ts') and file != 'index.ts':
                module_name = file[:-3]
                index_lines.append(f"export * from './{module_name}';")
                
        if index_lines:
            with open(os.path.join(root, 'index.ts'), 'w') as f:
                f.write('\n'.join(index_lines) + '\n')
                
    # Generate main index.ts for endpoints
    main_index_lines = []
    for item in sorted(os.listdir(base_dir)):
        item_path = os.path.join(base_dir, item)
        if os.path.isdir(item_path):
            main_index_lines.append(f"export * as {item.replace('-', '_')} from './{item}';")
        elif item.endswith('.ts') and item != 'index.ts':
            module_name = item[:-3]
            main_index_lines.append(f"export * from './{module_name}';")
            
    with open(os.path.join(base_dir, 'index.ts'), 'w') as f:
        f.write('\n'.join(main_index_lines) + '\n')
        
    # Generate root index.ts for src/lib/accurate
    root_index_lines = [
        "export * from './client';",
        "export * from './endpoints';"
    ]
    with open('src/lib/accurate/index.ts', 'w') as f:
        f.write('\n'.join(root_index_lines) + '\n')
        
    print("Generated index.ts files for easy importing.")

if __name__ == '__main__':
    generate_index_files()
