import json
import os
import re

def to_camel_case(text):
    text = re.sub(r'[^a-zA-Z0-9]', ' ', text)
    words = text.split()
    if not words:
        return ""
    return words[0].lower() + "".join(w.capitalize() for w in words[1:])

def clean_path_to_name(path):
    # /api/customer/save.do -> customerSave
    name = path.replace('/api/', '').replace('.do', '')
    return to_camel_case(name)

def generate_lib():
    with open('accurate_api.json', 'r') as f:
        spec = json.load(f)

    base_dir = 'src/lib/accurate'
    endpoints_dir = os.path.join(base_dir, 'endpoints')
    os.makedirs(endpoints_dir, exist_ok=True)

    # 1. Create Base Client
    client_content = """import axios from 'axios';

const ACCURATE_BASE_URL = 'https://account.accurate.id';

export const accurateClient = axios.create({
  baseURL: ACCURATE_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add Session ID or Auth token if needed
accurateClient.interceptors.request.use((config) => {
  // You can implement session management here
  return config;
});
"""
    with open(os.path.join(base_dir, 'client.ts'), 'w') as f:
        f.write(client_content)

    # 2. Parse Paths
    paths = spec.get('paths', {})
    
    for path, methods in paths.items():
        for method, info in methods.items():
            # Create a specific directory structure for endpoints
            # /api/customer/save.do -> src/lib/accurate/endpoints/customer/save.ts
            sub_path = path.replace('/api/', '').replace('.do', '')
            parts = sub_path.split('/')
            
            if len(parts) > 1:
                category = parts[0]
                filename = parts[-1]
                category_dir = os.path.join(endpoints_dir, category)
                os.makedirs(category_dir, exist_ok=True)
                file_path = os.path.join(category_dir, f"{filename}.ts")
            else:
                filename = parts[0]
                file_path = os.path.join(endpoints_dir, f"{filename}.ts")

            func_name = clean_path_to_name(path)
            summary = info.get('summary', path)
            description = info.get('description', '')
            
            # Simple parameter handling
            params_type = "any"
            
            content = f"""import {{ accurateClient }} from '../../client';

/**
 * {summary}
 * {description}
 */
export async function {func_name}(params: any) {{
  return accurateClient.{method}('{path}', { 'params' if method == 'get' else 'params' });
}}
"""
            # Note: Accurate usually expects data in the body for POST, and as query params for GET.
            # Axios handles second arg as body for POST, and config for GET.
            if method == 'get':
                content = f"""import {{ accurateClient }} from '../../client';

/**
 * {summary}
 * {description}
 */
export async function {func_name}(params: any) {{
  return accurateClient.get('{path}', {{ params }});
}}
"""
            elif method == 'post':
                content = f"""import {{ accurateClient }} from '../../client';

/**
 * {summary}
 * {description}
 */
export async function {func_name}(data: any) {{
  return accurateClient.post('{path}', data);
}}
"""

            with open(file_path, 'w') as f:
                f.write(content)

    print(f"Generated {len(paths)} endpoint files.")

if __name__ == "__main__":
    generate_lib()
