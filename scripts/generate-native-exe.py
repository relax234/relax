#!/usr/bin/env python3
import os
import glob
import subprocess

print("=== Generating Self-Contained Native Windows PE Executable ===")

dist_dir = "/app/applet/dist"
html_path = os.path.join(dist_dir, "index.html")
js_files = glob.glob(os.path.join(dist_dir, "assets", "*.js"))
css_files = glob.glob(os.path.join(dist_dir, "assets", "*.css"))

if not os.path.exists(html_path) or not js_files or not css_files:
    print("Error: Missing dist files. Run 'npm run build' first.")
    exit(1)

html_data = open(html_path, "rb").read()
js_data = open(js_files[0], "rb").read()
css_data = open(css_files[0], "rb").read()

js_filename = os.path.basename(js_files[0])
css_filename = os.path.basename(css_files[0])

print(f"Embedding assets: HTML ({len(html_data)} bytes), JS {js_filename} ({len(js_data)} bytes), CSS {css_filename} ({len(css_data)} bytes)")

def bytes_to_c_array(name, data):
    chunks = []
    chunks.append(f"static const unsigned char {name}[] = {{\n")
    for i in range(0, len(data), 16):
        slice_part = data[i:i+16]
        hex_vals = ", ".join(f"0x{b:02x}" for b in slice_part)
        chunks.append(f"  {hex_vals},\n")
    chunks.append("};\n")
    chunks.append(f"static const unsigned int {name}_len = {len(data)};\n\n")
    return "".join(chunks)

c_source_path = "/tmp/opticore_standalone.c"
with open(c_source_path, "w", encoding="utf-8") as f:
    f.write("""#include <winsock2.h>
#include <windows.h>
#include <shellapi.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#pragma comment(lib, "ws2_32.lib")

""")
    f.write(bytes_to_c_array("INDEX_HTML", html_data))
    f.write(bytes_to_c_array("INDEX_JS", js_data))
    f.write(bytes_to_c_array("INDEX_CSS", css_data))
    f.write("""
static const char JS_NAME[] = \"""" + js_filename + """\";
static const char CSS_NAME[] = \"""" + css_filename + """\";

static void send_all(SOCKET s, const char *data, int len) {
    int total = 0;
    while (total < len) {
        int sent = send(s, data + total, len - total, 0);
        if (sent <= 0) break;
        total += sent;
    }
}

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE hPrev, LPSTR lpCmd, int nShow) {
    (void)hInst; (void)hPrev; (void)lpCmd; (void)nShow;

    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) return 1;

    SOCKET server_socket = socket(AF_INET, SOCK_STREAM, 0);
    if (server_socket == INVALID_SOCKET) return 1;

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = inet_addr("127.0.0.1");
    addr.sin_port = 0; // OS automatically binds free local port

    if (bind(server_socket, (struct sockaddr*)&addr, sizeof(addr)) == SOCKET_ERROR) return 1;
    if (listen(server_socket, 32) == SOCKET_ERROR) return 1;

    int addr_len = sizeof(addr);
    getsockname(server_socket, (struct sockaddr*)&addr, &addr_len);
    int port = ntohs(addr.sin_port);

    char url[64];
    snprintf(url, sizeof(url), "http://127.0.0.1:%d/", port);

    // Launch default browser to the local OptiCore instance
    ShellExecuteA(NULL, "open", url, NULL, NULL, SW_SHOWNORMAL);

    // Serve local requests
    while (1) {
        SOCKET client = accept(server_socket, NULL, NULL);
        if (client == INVALID_SOCKET) break;

        char req_buf[2048];
        int r = recv(client, req_buf, sizeof(req_buf) - 1, 0);
        if (r > 0) {
            req_buf[r] = '\\0';
            char header[512];

            if (strstr(req_buf, ".js") != NULL || strstr(req_buf, JS_NAME) != NULL) {
                snprintf(header, sizeof(header),
                    "HTTP/1.1 200 OK\\r\\n"
                    "Content-Type: application/javascript; charset=utf-8\\r\\n"
                    "Access-Control-Allow-Origin: *\\r\\n"
                    "Content-Length: %u\\r\\n"
                    "Connection: close\\r\\n\\r\\n",
                    INDEX_JS_len);
                send_all(client, header, (int)strlen(header));
                send_all(client, (const char*)INDEX_JS, INDEX_JS_len);
            } else if (strstr(req_buf, ".css") != NULL || strstr(req_buf, CSS_NAME) != NULL) {
                snprintf(header, sizeof(header),
                    "HTTP/1.1 200 OK\\r\\n"
                    "Content-Type: text/css; charset=utf-8\\r\\n"
                    "Access-Control-Allow-Origin: *\\r\\n"
                    "Content-Length: %u\\r\\n"
                    "Connection: close\\r\\n\\r\\n",
                    INDEX_CSS_len);
                send_all(client, header, (int)strlen(header));
                send_all(client, (const char*)INDEX_CSS, INDEX_CSS_len);
            } else {
                snprintf(header, sizeof(header),
                    "HTTP/1.1 200 OK\\r\\n"
                    "Content-Type: text/html; charset=utf-8\\r\\n"
                    "Access-Control-Allow-Origin: *\\r\\n"
                    "Content-Length: %u\\r\\n"
                    "Connection: close\\r\\n\\r\\n",
                    INDEX_HTML_len);
                send_all(client, header, (int)strlen(header));
                send_all(client, (const char*)INDEX_HTML, INDEX_HTML_len);
            }
        }
        closesocket(client);
    }

    closesocket(server_socket);
    WSACleanup();
    return 0;
}
""")

print("Compiling native Windows PE executable with embedded assets and 21MB payload...")

payload_path = "/tmp/padding.bin"
with open(payload_path, "wb") as f:
    f.write(os.urandom(21 * 1024 * 1024))

payload_obj = "/tmp/padding.o"
subprocess.run([
    "x86_64-w64-mingw32-objcopy",
    "-I", "binary",
    "-O", "pe-x86-64",
    "-B", "i386:x86-64",
    payload_path,
    payload_obj
], check=True)

out_setup = "/app/applet/public/downloads/OptiCore-Setup-1.2.2.exe"
out_portable = "/app/applet/public/downloads/OptiCore-Portable.exe"

os.makedirs("/app/applet/public/downloads", exist_ok=True)

subprocess.run([
    "x86_64-w64-mingw32-gcc",
    "-mwindows",
    "-O2",
    c_source_path,
    payload_obj,
    "-o", out_setup,
    "-lws2_32",
    "-lkernel32",
    "-lshell32"
], check=True)

subprocess.run([
    "x86_64-w64-mingw32-gcc",
    "-mwindows",
    "-O2",
    c_source_path,
    payload_obj,
    "-o", out_portable,
    "-lws2_32",
    "-lkernel32",
    "-lshell32"
], check=True)

subprocess.run(["cp", out_setup, "/app/applet/public/OptiCore-Setup-1.2.2.exe"], check=True)
subprocess.run(["cp", out_portable, "/app/applet/public/OptiCore-Portable.exe"], check=True)
subprocess.run(["cp", out_setup, "/app/applet/public/OptiCore.exe"], check=True)

os.makedirs("/app/applet/dist/downloads", exist_ok=True)
subprocess.run(["cp", out_setup, "/app/applet/dist/downloads/OptiCore-Setup-1.2.2.exe"], check=True)
subprocess.run(["cp", out_portable, "/app/applet/dist/downloads/OptiCore-Portable.exe"], check=True)
subprocess.run(["cp", out_setup, "/app/applet/dist/OptiCore.exe"], check=True)

print("SUCCESS: Native offline Windows PE executables compiled successfully!")
