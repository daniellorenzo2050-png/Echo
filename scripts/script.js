// Configuração do IndexedDB para armazenar mensagens, vídeos, arquivos e figurinhas localmente
const DB_NAME = 'EchoDB';
const DB_VERSION = 1;
let db = null;

function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Erro ao abrir o IndexedDB:", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("IndexedDB aberto com sucesso.");
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            if (!database.objectStoreNames.contains('messages')) {
                database.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
            }
            if (!database.objectStoreNames.contains('media')) {
                database.createObjectStore('media', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// Salvar dado genérico no IndexedDB
function saveToDB(storeName, data) {
    return new Promise((resolve, reject) => {
        if (!db) return reject("Banco não inicializado");
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

// Lógica de Conexão WebSocket com o Echo Server
let ws = null;
let myUserId = prompt("Digite seu ID de usuário para entrar no Echo:") || "user_" + Math.floor(Math.random() * 1000);
let activeReceiverId = "contato_exemplo"; 
let selectedFileObject = null;

document.getElementById('current-user-display').innerText = `ID: ${myUserId}`;

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/websocket`;
    
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("Conectado ao Echo Server");
        ws.send(JSON.stringify({ type: 'register', userId: myUserId }));
    };

    ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'receive_message') {
            // Salva mensagem recebida no IndexedDB
            await saveToDB('messages', {
                senderId: data.senderId,
                receiverId: myUserId,
                text: data.text,
                timestamp: data.timestamp,
                type: 'text'
            });
            appendMessageToUI(data.text, 'received');
        }
    };

    ws.onclose = () => {
        console.log("Desconectado. Tentando reconectar em 3s...");
        setTimeout(connectWebSocket, 3000);
    };
}

// Manipulação da Interface e Elementos
const messageInput = document.getElementById('message-input');
const btnSend = document.getElementById('btn-send');
const messagesContainer = document.getElementById('messages-container');
const btnAttach = document.getElementById('btn-attach');
const fileInput = document.getElementById('file-input');

btnAttach.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFileObject = file;
        alert(`Arquivo selecionado: ${file.name}. Clique em enviar para salvar e despachar.`);
    }
});

btnSend.addEventListener('click', async () => {
    const text = messageInput.value.trim();
    const timestamp = new Date().toISOString();

    if (selectedFileObject) {
        // Salva arquivo/vídeo/figurinha no IndexedDB
        const mediaData = {
            name: selectedFileObject.name,
            type: selectedFileObject.type,
            blob: selectedFileObject,
            timestamp
        };
        await saveToDB('media', mediaData);

        // Renderiza na UI localmente
        const isVideo = selectedFileObject.type.startsWith('video');
        const isImage = selectedFileObject.type.startsWith('image');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message sent';
        
        if (isVideo) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(selectedFileObject);
            video.controls = true;
            messageDiv.appendChild(video);
        } else if (isImage) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(selectedFileObject);
            messageDiv.appendChild(img);
        } else {
            messageDiv.innerText = `[Arquivo: ${selectedFileObject.name}]`;
        }
        
        messagesContainer.appendChild(messageDiv);
        selectedFileObject = null;
        fileInput.value = '';
    }

    if (text) {
        // Salva mensagem de texto no IndexedDB
        await saveToDB('messages', {
            senderId: myUserId,
            receiverId: activeReceiverId,
            text,
            timestamp,
            type: 'text'
        });

        // Envia pelo WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'send_message',
                senderId: myUserId,
                receiverId: activeReceiverId,
                text,
                timestamp
            }));
        }

        appendMessageToUI(text, 'sent');
        messageInput.value = '';
    }
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

function appendMessageToUI(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerText = text;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Inicialização da Aplicação
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await initIndexedDB();
        connectWebSocket();
    } catch (err) {
        console.error("Falha ao inicializar o banco local:", err);
    }
});
