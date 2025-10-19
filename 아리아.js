//@name information-manager
//@display-name 정보 관리
//@version 1.0
//@description AI 응답을 분석하여 캐릭터 정보를 자동으로 갱신하고 관리합니다. RisuAI의 플러그인 API를 활용하여 안정적으로 마지막 메시지를 분석합니다.

// ===== 정보 관리 v1.0 =====
// 제작: 챗붕
// 정식 출시 버전

var InformationManager;
(function() {
    'use strict';

    // ================== 플러그인 데이터 및 설정 ==================

    const STORAGE_KEY_PREFIX = 'information_manager_data_';
    const LOREBOOK_NAME = '정보 관리 플러그인';
    let currentCharacterId = '';
    let saveDebounceTimer;

    InformationManager = function() {};
    InformationManager.toString = () => '(' + arguments.callee.caller.toString() + ')();';

    // 기본 설정값
    const DEFAULT_SETTINGS = {
        uiText: {
            tabs: { info: "정보", groups: "소속 관리", saveLoad: "세이브&로드", links: "외부 링크", ui: "UI", settings: "설정", hotkeys: "단축키", log: "로그" },
            header: { newChat: "새 채팅", parseResponse: "응답 분석", injectLorebook: "로어북 주입", autoUpdate: "자동 업데이트", config: "설정" },
            info: { newChar: "새 인물 추가", charName: "이름", status: "상태", affiliation: "소속", unaffiliated: "무소속", active: "인물 활성", inactive: "인물 비활성", user: "User", memoActive: "메모 활성", sort: "정렬 (낮을수록 위)", memo: "메모", statCount: "스탯 개수: ", newStatName: "새 스탯", location: "현재 위치", searchPlaceholder: "이름, 메모 검색...", filterStatus: "상태 필터", filterAll: "전체", filterStat: "스탯 필터 (예: 호감도 > 50)", reactivateInactiveCharsToggle: "비활성 인물 자동 활성화" },
            groups: { newGroup: "새 소속 추가", groupName: "소속 이름", deleteConfirm: "'{groupName}' 소속을 정말 삭제하시겠습니까? 소속된 인물들은 무소속 상태가 됩니다." },
            saveLoad: { slotDefaultName: '세이브 슬롯', addSlot: '새 슬롯 추가', save: '세이브', load: '로드', delete: '삭제', loadConfirm: '정말 로드하시겠습니까? 현재 정보 설정이 덮어씌워집니다.', deleteConfirm: '정말 삭제하시겠습니까?', saveToFile: '파일로 저장', loadFromFile: '파일에서 로드', fileLoadConfirm: '파일을 로드하시겠습니까? 플러그인의 모든 데이터(세이브 슬롯, 설정 포함)가 파일의 내용으로 덮어씌워집니다!' },
            links: { newLink: '새 링크 추가', linkName: '링크 이름', linkUrl: 'URL', open: '호출', deleteConfirm: '이 링크를 정말 삭제하시겠습니까?' },
            ui: { panelBg: '패널 배경색', headerBg: '헤더 배경색', panelBgImage: '패널 배경 이미지 URL', navBg: '내비게이션 배경색', cardBg: '카드 배경색', inputBg: '입력창 배경색', fontSize: '폰트 크기', textColor: '기본 텍스트 색상', inputTextColor: '입력창 텍스트 색상' },
            settings: { lorebookInstruction: '로어북 지침', summaryTagName: '상태창 키워드', summaryTagDesc: 'AI 응답에서 정보를 추출할 <details><summary>태그 안의 텍스트입니다. (기본값: info)', characterDetailFormat: '캐릭터 정보 형식', characterDetailFormatDesc: '{{character_summary}}에 들어갈 각 인물의 정보 형식을 지정합니다. 사용 가능한 변수: {{group}}, {{location}}, {{stats}}, {{memo}}', resetDefault: '기본값으로 되돌리기', headerButtons: '헤더 버튼 설정', icon: '아이콘/이미지 URL', text: '텍스트', buttonParse: '응답 분석', buttonInject: '로어북 주입', buttonAuto: '자동 업데이트', buttonConfig: '설정', buttonNewChat: '새 채팅', logSettings: '로그 설정', enableLogging: '로그 기록 활성화', maxLogEntries: '최대 로그 항목 수', clearAll: '전체 삭제', resetAllData: '모든 데이터 초기화' },
            hotkeys: { toggleWindow: "창 열기/닫기", parseResponse: "응답 분석", injectLorebook: "로어북 주입", toggleAutoInject: "자동 업데이트 토글", save: "저장하려면 클릭 후 키 입력" }
        },
        uiStyles: { panelBg: '#ffffff', headerBg: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', panelBgImage: '', navBg: 'rgba(240,240,240,0.8)', cardBg: 'rgba(249,249,249,0.9)', inputBg: '#ffffff', fontSize: '14px', textColor: '#333333', inputTextColor: '#333333' },
        functionality: {
            summaryTagName: "info",
            reactivateInactiveChars: true,
            enableLogging: true,
            maxLogEntries: 100,
            lorebookInstruction: `[System: 당신의 임무는 아래의 두 부분으로 구성된 응답을 생성하는 것입니다.]

### 1. 역할극 묘사
- 생생하고 몰입감 있는 역할극을 진행합니다.
- 아래 제공되는 'character_summary'의 실시간 정보를 당신의 연기에 반드시 반영해야 합니다.
{{character_summary}}

# 출력 필수: 'info'
- 모든 역할극 묘사가 끝난 직후, 반드시 다음 형식을 반드시 출력해야 합니다.
- 이 블록은 당신의 생각(<Thoughts>)이 아니라, 사용자에게 보여지는 실제 출력물의 마지막 부분입니다.
- 'character_summary'와 최신 대화 내용을 종합하여 아래 내용을 항상 완전한 형태로 채워주세요.
(변경된 부분만 쓰는 것이 아닙니다.)

## 예시
<details><summary>info</summary>
캐릭터 이름:
'세부 정보'
캐릭터 이름:
'세부정보'
(다른 모든 활성 인물 정보를 동일한 형식으로 추가)
</details>

## 세부 정보 항목:
  - 소속: 
  - 위치: 
  - 스탯: [스탯 정보 요약]
  - 메모: [성격, 심리상태, 주요 관계 등]`,
            characterDetailFormat: `  - 소속: {{group}}
  - 위치: {{location}}
  - 스탯: {{stats}}
  - 메모: {{memo}}`,
            icons: { newChat: '✨', parse: '🔍', inject: '📖', auto: '🔄', config: '⚙️' },
            hotkeys: { toggleWindow: "", parseResponse: "", injectLorebook: "", toggleAutoInject: "" }
        }
    };

    // 플러그인 전체 데이터
    let pluginData = {};

    function initializePluginData() {
        pluginData = {
            settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
            info: { characters: [], groups: [], unaffiliatedCollapsed: false },
            saveSlots: [ { id: 1, name: '세이브 슬롯', image: null, timestamp: null, data: null } ],
            externalLinks: [],
            logs: { autoUpdate: [], changes: [], execution: [], lastParsed: [] },
            runtime: { autoUpdateEnabled: false, filters: { search: '', status: 'all', stat: '' } },
        };
    }

    // ================== 데이터 관리 ==================

    function getStorageKey() { return `${STORAGE_KEY_PREFIX}${currentCharacterId}`; }
    function debouncedSaveData() { clearTimeout(saveDebounceTimer); saveDebounceTimer = setTimeout(saveData, 500); }
    function saveData() { if (!currentCharacterId) return; try { localStorage.setItem(getStorageKey(), JSON.stringify(pluginData)); } catch (error) { console.error('정보 관리 데이터 저장 실패:', error); logMessage('execution', `데이터 저장 실패: ${error.message}`, 'error'); } }

    function loadData() {
        if (!currentCharacterId) { initializePluginData(); return; }
        try {
            const savedData = localStorage.getItem(getStorageKey());
            if (savedData) {
                const loaded = JSON.parse(savedData);
                const defaultCopy = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
                if (loaded.info && loaded.info.characters) { loaded.info.characters.forEach(c => { delete c.destination; }); }
                const mergedSettings = deepMerge(defaultCopy, loaded.settings || {});
                pluginData = {
                    settings: mergedSettings,
                    info: loaded.info || { characters: [], groups: [], unaffiliatedCollapsed: false },
                    saveSlots: loaded.saveSlots || [],
                    externalLinks: loaded.externalLinks || [],
                    logs: loaded.logs || { autoUpdate: [], changes: [], execution: [], lastParsed: [] },
                    runtime: { autoUpdateEnabled: false, filters: { search: '', status: 'all', stat: '' } },
                };
                if (!pluginData.logs.lastParsed) pluginData.logs.lastParsed = [];
                pluginData.info.groups = pluginData.info.groups || [];
                pluginData.info.unaffiliatedCollapsed = pluginData.info.unaffiliatedCollapsed || false;
                pluginData.info.characters.forEach(c => { c.groupId = c.groupId === undefined ? null : c.groupId; if (c.memoActive === undefined) c.memoActive = true; });
            } else { initializePluginData(); }
            logMessage('execution', `\`loadData()\` 호출: 캐릭터 ID '${currentCharacterId}'의 데이터를 로드했습니다.`);
        } catch (error) { console.error('정보 관리 데이터 로드 실패:', error); logMessage('execution', `데이터 로드 실패: ${error.message}`, 'error'); initializePluginData(); }
    }

    function deepMerge(target, source) { for (const key in source) { if (source.hasOwnProperty(key)) { if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) { if (!target[key] || typeof target[key] !== 'object') { target[key] = {}; } deepMerge(target[key], source[key]); } else { target[key] = source[key]; } } } return target; }

    function onCharacterChange() {
        try {
            const char = globalThis.__pluginApis__.getChar();
            if (char && char.chaId !== currentCharacterId) { if (currentCharacterId) saveData(); currentCharacterId = char.chaId; logMessage('execution', `캐릭터 변경 감지: ${currentCharacterId}. 데이터 로드를 시작합니다.`); loadData(); if (uiController.isOpen) uiController.updateUI(); }
            else if (!char && currentCharacterId) { saveData(); currentCharacterId = ''; logMessage('execution', `캐릭터 선택 해제됨. 데이터를 초기화합니다.`); initializePluginData(); if (uiController.isOpen) uiController.updateUI(); }
        } catch(e) { /* API 준비 전일 수 있음 */ }
    }

    // ================== 핵심 로직 (AI 응답 분석 및 처리) ==================

    function logMessage(type, message, level = 'info') {
        if (!pluginData.settings.functionality.enableLogging && type !== 'execution') return;

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = { timestamp, message, level, id: Date.now() + Math.random() };

        if (!pluginData.logs) pluginData.logs = { autoUpdate: [], changes: [], execution: [], lastParsed: [] };
        const logArray = pluginData.logs[type];

        if (!logArray) { console.warn(`'${type}' 타입의 로그를 찾을 수 없습니다.`); return; }

        logArray.unshift(logEntry);

        const maxEntries = pluginData.settings.functionality.maxLogEntries || 100;
        if (logArray.length > maxEntries) {
            logArray.splice(maxEntries);
        }

        if(uiController.isOpen && uiController.currentTab === 'log') { uiController.renderCurrentTab(); }
    }

    function updateLorebookOnUserChange() {
        if (!pluginData.runtime.autoUpdateEnabled) return;
        setTimeout(() => {
            logMessage('autoUpdate', '사용자 수정 사항을 로어북에 주입합니다.');
            injectToLorebook();
        }, 500);
    }

    function getLlmInstruction() {
        const activeChars = (pluginData.info.characters || []).filter(c => c.status === 'active' || c.status === 'user');
        const detailFormatTemplate = pluginData.settings.functionality.characterDetailFormat || '';

        const detailedSummary = activeChars.sort((a,b) => (a.sort || 99) - (b.sort || 99)).map(c => {
            const groupData = (pluginData.info.groups || []).find(g => g.id == c.groupId);

            const replacements = {
                group: groupData ? groupData.name : '',
                location: c.location || '',
                stats: (c.stats && c.stats.length > 0) ? (c.stats || []).map(s => `${s.name}(${s.value})`).join(', ') : '',
                memo: (c.memo && c.memoActive) ? c.memo.replace(/\n/g, ' ') : ''
            };

            let finalDetail = detailFormatTemplate.split('\n').map(line => {
                const match = line.match(/\{\{(\w+)\}\}/);
                if (match) {
                    const key = match[1];
                    if (replacements[key]) {
                        return line.replace(`{{${key}}}`, replacements[key]);
                    } else {
                        return null; // 데이터가 없으면 이 라인을 제거
                    }
                }
                return line;
            }).filter(line => line !== null).join('\n');

            return `${c.name}:\n${finalDetail}`;
        }).join('\n\n');

        const finalSummary = detailedSummary.trim() || '현재 활성화된 인물이 없습니다.';

        let instruction = pluginData.settings.functionality.lorebookInstruction;

        instruction = instruction.replace(/\{\{character_summary\}\}/g, finalSummary);

        return instruction;
    }

    function injectToLorebook() {
        logMessage('execution', '`injectToLorebook()` 호출됨. 채팅 로어북 주입을 시작합니다.');
        try {
            const char = globalThis.__pluginApis__.getChar();
            if (!char) { logMessage('execution', '로어북 주입 실패: 현재 캐릭터를 찾을 수 없습니다.', 'error'); return; }

            const chat = char.chats[char.chatPage];
            if (!chat) { logMessage('execution', '로어북 주입 실패: 현재 채팅을 찾을 수 없습니다.', 'error'); return; }

            if (!Array.isArray(chat.localLore)) chat.localLore = [];

            let lorebook = chat.localLore.find(l => l.comment === LOREBOOK_NAME);
            if (!lorebook) {
                lorebook = { key: "", comment: LOREBOOK_NAME, content: "", mode: "normal", insertorder: 100, alwaysActive: true, secondkey: "", selective: false, useRegex: false };
                chat.localLore.push(lorebook);
                logMessage('execution', `현재 채팅에 '${LOREBOOK_NAME}' 로어북이 없어 새로 생성했습니다.`, 'info');
            }

            lorebook.content = `@@depth 0\n${getLlmInstruction()}`;
            globalThis.__pluginApis__.setChar(char);
            logMessage('autoUpdate', `현재 채팅의 로어북에 정보를 주입했습니다.`, 'success');
        } catch (e) { console.error("로어북 업데이트 오류:", e); logMessage('execution', `로어북 주입 중 오류 발생: ${e.message}`, 'error'); }
    }

    async function parseLastResponse(content) {
        if (!content) {
            logMessage('execution', '`parseLastResponse()` 호출됨. 수동 분석을 위해 마지막 메시지를 가져옵니다.');
            try {
                const char = globalThis.__pluginApis__.getChar();
                const chat = char.chats[char.chatPage];
                if (chat.message && chat.message.length > 0) {
                    content = chat.message[chat.message.length - 1].data;
                } else {
                    throw new Error("분석할 메시지가 채팅 기록에 없습니다.");
                }
            } catch (e) {
                logMessage('autoUpdate', e.message || "마지막 메시지를 가져오는 데 실패했습니다.", 'error');
                if (e.message === "분석할 메시지가 채팅 기록에 없습니다.") {
                    handleNewChatLogic();
                }
                return;
            }
        } else {
             logMessage('execution', '`parseLastResponse()` 호출됨. 자동 분석을 시작합니다.');
        }

        if (!content || content.trim() === '') {
            logMessage('autoUpdate', "분석할 마지막 메시지가 비어있습니다.", 'warn');
            return;
        }

        const summaryTagName = pluginData.settings.functionality.summaryTagName || 'info';
        const escapedSummary = summaryTagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const infoRegex = new RegExp(`<details>\\s*<summary>${escapedSummary}<\\/summary>([\\s\\S]*?)<\\/details>`);
        const match = content.match(infoRegex);

        if (!match || !match[1]) {
            logMessage('autoUpdate', `'${summaryTagName}' 블록을 찾지 못했습니다.`, 'warn');
            return;
        }

        logMessage('execution', `'${summaryTagName}' 블록을 찾음. 라인 단위 파싱 시작.`);
        const infoContent = match[1].trim();
        let changesMade = false;

        const allParsedCharacters = {};
        let currentCharacterName = null;
        const lines = infoContent.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            const nameMatch = trimmedLine.match(/^(.+?)(?:\s*\(캐릭터 이름\))?:$/);
            if (nameMatch && !trimmedLine.startsWith('-') && !trimmedLine.startsWith(`'세부`)) {
                currentCharacterName = nameMatch[1].trim();
                if (!allParsedCharacters[currentCharacterName]) {
                    allParsedCharacters[currentCharacterName] = { stats: [], location: '', memo: '', groupId: undefined };
                }
                continue;
            }

            if (currentCharacterName) {
                const dataMatch = trimmedLine.match(/^\s*-\s*([^:]+):\s*(.*)/);
                if (dataMatch) {
                    const key = dataMatch[1].trim();
                    let value = dataMatch[2].trim();

                    if (key === '스탯' && value.startsWith('[') && value.endsWith(']')) {
                        value = value.substring(1, value.length - 1);
                    }

                    switch (key) {
                        case '위치':
                            allParsedCharacters[currentCharacterName].location = value;
                            break;
                        case '메모':
                            allParsedCharacters[currentCharacterName].memo = value;
                            break;
                        case '스탯':
                            const stats = [];
                            if (value) {
                                const statPairs = value.split(',').map(s => s.trim());
                                for (const pair of statPairs) {
                                    const statMatch = pair.match(/([^()]+)\s*\(([^)]+)\)/);
                                    if (statMatch) {
                                        const statName = statMatch[1].trim();
                                        const statValue = parseInt(statMatch[2].trim(), 10);
                                        if (!isNaN(statValue)) {
                                            stats.push({ name: statName, value: statValue });
                                        }
                                    }
                                }
                            }
                            allParsedCharacters[currentCharacterName].stats = stats;
                            break;
                        case '소속':
                            const groupName = value;
                            if (groupName && groupName !== '없음' && groupName.trim() !== '') {
                                let group = pluginData.info.groups.find(g => g.name === groupName);
                                if (!group) {
                                    const newGroup = { id: Date.now() + Math.random(), name: groupName, collapsed: false };
                                    pluginData.info.groups.push(newGroup);
                                    group = newGroup;
                                    changesMade = true;
                                    logMessage('changes', `새 소속 '${groupName}'이(가) 상태창에 의해 추가되었습니다.`);
                                }
                                allParsedCharacters[currentCharacterName].groupId = group.id;
                            } else {
                                 allParsedCharacters[currentCharacterName].groupId = null;
                            }
                            break;
                    }
                }
            }
        }

        if (Object.keys(allParsedCharacters).length > 0) {
            logMessage('lastParsed', JSON.stringify(allParsedCharacters, null, 2));
        }

        for (const name in allParsedCharacters) {
            const parsedInfo = allParsedCharacters[name];
            let char = pluginData.info.characters.find(c => c.name === name);

            if (char && char.status === 'inactive' && pluginData.settings.functionality.reactivateInactiveChars) {
                char.status = 'active';
                changesMade = true;
                logMessage('changes', `비활성 인물 '${name}'이(가) 응답에 포함되어 자동으로 활성화합니다.`);
            }

            if (!char) {
                char = { id: Date.now() + Math.random(), name, status: 'active', sort: pluginData.info.characters.length, memo: '', memoActive: true, location: '', groupId: null, stats: [], relationships: {} };
                pluginData.info.characters.push(char);
                changesMade = true;
                logMessage('changes', `새 인물 '${name}'을(를) 상태창에서 발견하여 추가했습니다.`);
            }

            if (parsedInfo.location && char.location !== parsedInfo.location) {
                logMessage('changes', `'${name}' 위치 변경: ${char.location || '(없음)'} -> ${parsedInfo.location}`);
                char.location = parsedInfo.location;
                changesMade = true;
            }

            if (parsedInfo.memo && char.memo !== parsedInfo.memo) {
                logMessage('changes', `'${name}'의 메모가 업데이트되었습니다.`);
                char.memo = parsedInfo.memo;
                changesMade = true;
            }

            if (parsedInfo.stats && JSON.stringify(char.stats) !== JSON.stringify(parsedInfo.stats)) {
                logMessage('changes', `'${name}'의 스탯이 업데이트되었습니다.`);
                char.stats = parsedInfo.stats;
                changesMade = true;
            }

            if (parsedInfo.groupId !== undefined && char.groupId !== parsedInfo.groupId) {
                const oldGroupName = (pluginData.info.groups.find(g => g.id === char.groupId) || {name: '무소속'}).name;
                const newGroupName = (pluginData.info.groups.find(g => g.id === parsedInfo.groupId) || {name: '무소속'}).name;
                logMessage('changes', `'${name}' 소속 변경: ${oldGroupName} -> ${newGroupName}`);
                char.groupId = parsedInfo.groupId;
                changesMade = true;
            }
        }

        if (changesMade) {
            logMessage('autoUpdate', '응답 분석으로 정보가 갱신되었습니다.', 'success');
            debouncedSaveData();
            if(uiController.isOpen) uiController.updateUI();

            if (pluginData.runtime.autoUpdateEnabled) {
                injectToLorebook();
            }
        } else {
            logMessage('autoUpdate', `'${summaryTagName}' 블록에서 변경 사항을 찾지 못했습니다.`, 'info');
        }
    }

    function handleNewChatLogic() {
        pluginData.logs.lastParsed = [];
        pluginData.info.characters = [];
        pluginData.info.groups = [];
        logMessage('execution', '새 채팅 시작. 모든 인물, 소속, 마지막 분석 정보를 초기화합니다.');
        debouncedSaveData();
        if (uiController.isOpen) uiController.updateUI();
    }

    async function handleAfterRequest(content, type) {
        // [Problem 2 Fix] Start: Automatically reactivate inactive characters mentioned in conversation
        if (pluginData.settings.functionality.reactivateInactiveChars) {
            let textToScan = content || ''; // Start with the AI's response
    
            try {
                const char = globalThis.__pluginApis__.getChar();
                const chat = char?.chats[char.chatPage];
                const messages = chat?.message || [];
                if (messages.length > 0) {
                    // Find the last user message to include in the scan
                    for (let i = messages.length - 1; i >= 0; i--) {
                        if (messages[i].role === 'user') {
                            textToScan += " " + messages[i].data;
                            break; // Found the most recent one, so we stop.
                        }
                    }
                }
            } catch (e) {
                logMessage('execution', `대화 기록 스캔 중 오류: ${e.message}`, 'warn');
            }
    
            const inactiveChars = (pluginData.info.characters || []).filter(c => c.status === 'inactive');
            if (inactiveChars.length > 0) {
                let reactivated = false;
                for (const char of inactiveChars) {
                    if (char.name && textToScan.includes(char.name)) {
                        char.status = 'active';
                        reactivated = true;
                        logMessage('changes', `비활성 인물 '${char.name}'이(가) 대화에 언급되어 자동으로 활성화합니다.`);
                    }
                }
    
                if (reactivated) {
                    debouncedSaveData();
                    if (uiController.isOpen) {
                        uiController.updateUI();
                    }
                    if (pluginData.runtime.autoUpdateEnabled) {
                        injectToLorebook();
                    }
                }
            }
        }
        // [Problem 2 Fix] End
    
        if (pluginData.runtime.autoUpdateEnabled) {
            logMessage('execution', 'AI 응답 수신. 자동 업데이트 로직을 실행합니다.');
            setTimeout(() => parseLastResponse(content), 100);
        }
    
        return content;
    }

    // ================== UI 생성 및 제어 ==================

    function createPluginUI() {
        if (document.getElementById('info-manager-main-icon')) return;
        const style = document.createElement('style');
        style.textContent = `
            #info-manager-main-icon { position: fixed; bottom: 90px; right: 20px; width: 50px; height: 50px; background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: grab; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: all 0.3s; z-index: 9998; user-select: none; }
            #info-manager-main-icon:hover { transform: translateY(-5px); } #info-manager-main-icon:active { cursor: grabbing; }
            .im-window { background-color: var(--im-panel-bg, #fff); background-image: var(--im-panel-bg-image, none); background-size: cover; background-position: center; background-repeat: no-repeat; resize: both; overflow: hidden; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 1400px; height: 85vh; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); z-index: 9999; display: none; flex-direction: column; color: var(--im-text-color, #333); }
            .im-window.active { display: flex; } .im-window * { font-size: var(--im-font-size, 14px); box-sizing: border-box; }
            .im-header { background: var(--im-header-bg, linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)); color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; cursor: move; user-select: none; }
            .im-header-title { font-size: 1.5em; font-weight: bold; }
            .im-header-controls { display: flex; align-items: center; gap: 10px; }
            .im-header-controls button { background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 5px; padding: 8px 12px; cursor: pointer; transition: background 0.3s; font-size: 1.1em; display: inline-flex; align-items: center; justify-content: center; line-height: 1; }
            .im-header-controls button:hover { background: rgba(255,255,255,0.4); }
            #im-close-btn { font-size: 1.5em; padding: 0 10px; }
            .im-main-content { display: flex; flex: 1; overflow: hidden; background: rgba(255,255,255,0.7); }
            .im-nav { background-color: var(--im-nav-bg, rgba(240,240,240,0.8)); padding: 10px 0; border-right: 1px solid #ddd; overflow-y: auto; flex-shrink: 0; width: 180px; }
            .im-nav-button { display: block; width: 100%; padding: 15px 20px; background: none; border: none; text-align: left; font-size: 1.1em; cursor: pointer; border-left: 4px solid transparent; color: inherit; }
            .im-nav-button:hover { background: rgba(224,224,224,0.8); } .im-nav-button.active { border-left-color: #ff7e5f; background: rgba(233,233,233,0.9); font-weight: bold; }
            .im-tab-content { flex: 1; padding: 20px; overflow-y: auto; }
            .im-tab-content h2 { font-size: 1.8em; margin-top: 0; padding-bottom: 10px; border-bottom: 2px solid #eee; color: inherit; }
            .im-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }
            .im-card { background-color: var(--im-card-bg, rgba(249,249,249,0.9)); border: 1px solid #ddd; border-radius: 8px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
            .im-input, .im-textarea, .im-select { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-top: 5px; background-color: var(--im-input-bg, #fff); color: var(--im-input-text-color, #333); }
            .im-button { padding: 8px 15px; border-radius: 5px; border: none; cursor: pointer; background: #667eea; color: white; transition: opacity 0.2s; }
            .im-button:hover { opacity: 0.9; } .im-button.danger { background: #ef4444; } .im-button.success { background: #22c55e; }
            .im-log-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; height: calc(100% - 80px); }
            .im-log-column { flex: 1; display: flex; flex-direction: column; }
            .im-log-box { border: 1px solid #ddd; border-radius: 8px; flex: 1; overflow-y: scroll; padding: 10px; background: rgba(253,253,253,0.9); }
            .im-log-entry { display: flex; justify-content: space-between; align-items: flex-start; padding: 5px 8px; border-bottom: 1px solid #f0f0f0; word-break: break-all; } .im-log-entry:last-child { border-bottom: none; }
            .im-log-entry.error { color: #ef4444; } .im-log-entry.warn { color: #f97316; } .im-log-entry.success { color: #22c55e; }
            .im-saveload-slot, .im-link-item { display: flex; align-items: center; gap: 15px; padding: 10px; border-bottom: 1px solid #eee; }
            .im-info-group { border: 1px solid #ccc; border-radius: 8px; margin-bottom: 20px; background: rgba(255,255,255,0.5); }
            .im-info-group-header { background-color: var(--im-nav-bg, rgba(240,240,240,0.8)); padding: 10px; font-size: 1.2em; font-weight: bold; border-bottom: 1px solid #ccc; cursor: pointer; user-select: none; }
            .im-info-group-header::before { content: '▼ '; display: inline-block; transition: transform 0.2s; }
            .im-info-group-header.collapsed::before { transform: rotate(-90deg); }
            .im-info-group-content { padding: 15px; } .im-info-group-content.collapsed { display: none; }
            .im-popup-window { position: fixed; z-index: 10001; background: #fff; border: 1px solid #ccc; box-shadow: 0 5px 15px rgba(0,0,0,0.3); border-radius: 8px; display: flex; flex-direction: column; resize: both; overflow: hidden; min-width: 300px; min-height: 200px; }
            .im-popup-header { padding: 8px; background: #f0f0f0; cursor: move; display: flex; justify-content: space-between; align-items: center; font-weight: bold; user-select: none; }
            .im-popup-content { flex-grow: 1; padding: 0; } .im-popup-iframe { width: 100%; height: 100%; border: none; }
        `;
        document.head.appendChild(style);

        const icon = document.createElement('div'); icon.id = 'info-manager-main-icon'; icon.innerHTML = 'ℹ️'; icon.onclick = (e) => { if (!e.defaultPrevented) uiController.toggleWindow(); }; document.body.appendChild(icon);
        let isIconDragging = false, iconOffsetX, iconOffsetY;
        icon.addEventListener('mousedown', (e) => { isIconDragging = true; iconOffsetX = e.clientX - icon.getBoundingClientRect().left; iconOffsetY = e.clientY - icon.getBoundingClientRect().top; icon.style.cursor = 'grabbing'; e.preventDefault(); });
        document.addEventListener('mousemove', (e) => { if (isIconDragging) { icon.style.left = `${e.clientX - iconOffsetX}px`; icon.style.top = `${e.clientY - iconOffsetY}px`; } });
        document.addEventListener('mouseup', () => { isIconDragging = false; icon.style.cursor = 'grab'; });

        const windowEl = document.createElement('div'); windowEl.className = 'im-window'; windowEl.id = 'im-window';
        windowEl.innerHTML = `<div class="im-header" id="im-header"><div id="im-header-title" class="im-header-title"></div><div class="im-header-controls"><button id="im-new-chat-btn"></button><button id="im-parse-response-btn"></button><button id="im-inject-lorebook-btn"></button><button id="im-auto-update-btn"></button><button id="im-config-btn"></button><button id="im-close-btn">×</button></div></div><div class="im-main-content"><nav id="im-nav" class="im-nav"></nav><div id="im-tab-content" class="im-tab-content"></div></div>`;
        document.body.appendChild(windowEl);

        const header = document.getElementById('im-header'); let isWindowDragging = false, windowOffset = { x: 0, y: 0 };
        header.addEventListener('mousedown', (e) => { if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return; isWindowDragging = true; const rect = windowEl.getBoundingClientRect(); windowOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top }; header.style.cursor = 'grabbing'; if (windowEl.style.transform !== 'none') { windowEl.style.transform = 'none'; windowEl.style.left = `${rect.left}px`; windowEl.style.top = `${rect.top}px`; } });
        document.addEventListener('mousemove', (e) => { if (!isWindowDragging) return; windowEl.style.left = `${e.clientX - windowOffset.x}px`; windowEl.style.top = `${e.clientY - windowOffset.y}px`; });
        document.addEventListener('mouseup', () => { isWindowDragging = false; header.style.cursor = 'move'; });

        document.getElementById('im-new-chat-btn').onclick = () => { logMessage('execution', '새 채팅 버튼 클릭됨. 정보 초기화를 시도합니다.'); handleNewChatLogic(); };
        document.getElementById('im-parse-response-btn').onclick = () => { logMessage('execution', '응답 분석 버튼 클릭됨.'); parseLastResponse(); };
        document.getElementById('im-inject-lorebook-btn').onclick = () => { logMessage('execution', '로어북 주입 버튼 클릭됨.'); injectToLorebook(); };
        document.getElementById('im-auto-update-btn').onclick = () => uiController.toggleAutoUpdate();
        document.getElementById('im-config-btn').onclick = () => uiController.switchTab('settings');
        document.getElementById('im-close-btn').onclick = () => uiController.toggleWindow();
    }

    const uiController = {
        isOpen: false, currentTab: 'info',
        toggleWindow: function() { logMessage('execution', `\`uiController.toggleWindow()\` 호출. 현재 상태: ${this.isOpen ? '열림' : '닫힘'}.`); if(!this.isOpen) onCharacterChange(); this.isOpen = !this.isOpen; const windowEl = document.getElementById('im-window'); windowEl.classList.toggle('active', this.isOpen); if (this.isOpen) { if(!windowEl.style.left || !windowEl.style.top || windowEl.style.transform) { windowEl.style.left = '50%'; windowEl.style.top = '50%'; windowEl.style.transform = 'translate(-50%, -50%)'; } this.updateUI(); } },
        updateUI: function() {
            if (!this.isOpen || !document.getElementById('im-window')) return;
            const { uiStyles, functionality, uiText } = pluginData.settings; const windowEl = document.getElementById('im-window');
            windowEl.style.setProperty('--im-panel-bg', uiStyles.panelBg); windowEl.style.setProperty('--im-header-bg', uiStyles.headerBg); windowEl.style.setProperty('--im-panel-bg-image', uiStyles.panelBgImage ? `url(${uiStyles.panelBgImage})` : 'none');
            windowEl.style.setProperty('--im-nav-bg', uiStyles.navBg); windowEl.style.setProperty('--im-card-bg', uiStyles.cardBg); windowEl.style.setProperty('--im-input-bg', uiStyles.inputBg);
            windowEl.style.setProperty('--im-font-size', uiStyles.fontSize); windowEl.style.setProperty('--im-text-color', uiStyles.textColor); windowEl.style.setProperty('--im-input-text-color', uiStyles.inputTextColor);

            const createButtonContent = (iconOrUrl, text) => {
                if (iconOrUrl && (iconOrUrl.startsWith('http') || iconOrUrl.startsWith('data:'))) {
                    return `<img src="${iconOrUrl}" style="width: 1.2em; height: 1.2em; vertical-align: middle; margin-right: 5px; object-fit: contain;"> ${text}`;
                }
                return `${iconOrUrl || ''} ${text}`;
            };

            document.getElementById('info-manager-main-icon').innerHTML = 'ℹ️'; document.getElementById('im-header-title').textContent = uiText.tabs[this.currentTab] || "정보 관리";
            document.getElementById('im-new-chat-btn').innerHTML = createButtonContent(functionality.icons.newChat, uiText.header.newChat);
            document.getElementById('im-parse-response-btn').innerHTML = createButtonContent(functionality.icons.parse, uiText.header.parseResponse);
            document.getElementById('im-inject-lorebook-btn').innerHTML = createButtonContent(functionality.icons.inject, uiText.header.injectLorebook);

            const autoUpdateBtn = document.getElementById('im-auto-update-btn');
            const autoUpdateStatus = pluginData.runtime.autoUpdateEnabled ? ' (ON)' : ' (OFF)';
            autoUpdateBtn.innerHTML = createButtonContent(functionality.icons.auto, uiText.header.autoUpdate + autoUpdateStatus);

            if (pluginData.runtime.autoUpdateEnabled) { autoUpdateBtn.style.background = 'rgba(100,255,100,0.3)'; }
            else { autoUpdateBtn.style.background = 'rgba(255,255,255,0.2)'; }

            document.getElementById('im-config-btn').innerHTML = createButtonContent(functionality.icons.config, uiText.header.config);
            this.renderNav(); this.renderCurrentTab();
        },
        renderNav: function() { const navEl = document.getElementById('im-nav'); navEl.innerHTML = ''; const { tabs } = pluginData.settings.uiText; for (const key in tabs) { const button = document.createElement('button'); button.className = `im-nav-button ${this.currentTab === key ? 'active' : ''}`; button.textContent = tabs[key]; button.onclick = () => this.switchTab(key); navEl.appendChild(button); } },
        switchTab: function(tabKey) { logMessage('execution', `\`uiController.switchTab('${tabKey}')\` 호출.`); this.currentTab = tabKey; this.updateUI(); },
        renderCurrentTab: function() { const contentEl = document.getElementById('im-tab-content'); contentEl.innerHTML = ''; if (!currentCharacterId) { contentEl.innerHTML = `<h2>캐릭터를 먼저 선택해주세요.</h2><p>캐릭터와 대화를 시작하면 플러그인이 활성화됩니다.</p>`; return; } const renderFunctionName = `render${this.currentTab.charAt(0).toUpperCase() + this.currentTab.slice(1)}Tab`; if (typeof this[renderFunctionName] === 'function') { this[renderFunctionName](); } else { contentEl.innerHTML = `<h2>'${this.currentTab}' 탭을 찾을 수 없습니다.</h2>`; } },
        toggleAutoUpdate: function() {
            pluginData.runtime.autoUpdateEnabled = !pluginData.runtime.autoUpdateEnabled;
            logMessage('autoUpdate', `자동 로어북 업데이트가 ${pluginData.runtime.autoUpdateEnabled ? '활성화' : '비활성화'}되었습니다.`);
            if (pluginData.runtime.autoUpdateEnabled) {
                injectToLorebook();
            }
            if (this.isOpen) this.updateUI();
        },
        getFilteredCharacters: function() {
            const { characters } = pluginData.info; const { search, status, stat } = pluginData.runtime.filters;
            return (characters || []).filter(char => {
                const searchTerm = search.toLowerCase(); if (searchTerm && !char.name.toLowerCase().includes(searchTerm) && !(char.memo || '').toLowerCase().includes(searchTerm)) { return false; }
                if (status !== 'all' && char.status !== status) { return false; }
                if (stat) { const statRegex = /(.+?)\s*([<>=!]+)\s*(\d+)/; const match = stat.match(statRegex); if (match) { const [, statName, operator, valueStr] = match; const value = parseInt(valueStr, 10); const charStat = (char.stats || []).find(s => s.name.trim().toLowerCase() === statName.trim().toLowerCase()); if (!charStat) return false; switch (operator) { case '>': if (!(charStat.value > value)) return false; break; case '>=': if (!(charStat.value >= value)) return false; break; case '<': if (!(charStat.value < value)) return false; break; case '<=': if (!(charStat.value <= value)) return false; break; case '=': case '==': if (!(charStat.value == value)) return false; break; case '!=': if (!(charStat.value != value)) return false; break; default: return false; } } }
                return true;
            });
        },
        renderCharacterList: function() {
            const container = document.getElementById('im-info-container');
            if (!container) return;
            container.innerHTML = '';

            const { info: text } = pluginData.settings.uiText;
            const filteredChars = this.getFilteredCharacters();
            const groups = pluginData.info.groups || [];

            groups.forEach(group => {
                const groupChars = filteredChars.filter(c => c.groupId == group.id);
                if (groupChars.length === 0) return;
                const groupEl = document.createElement('div');
                groupEl.className = 'im-info-group';
                const isCollapsed = group.collapsed || false;
                groupEl.innerHTML = `<div class="im-info-group-header ${isCollapsed ? 'collapsed' : ''}" data-group-id="${group.id}">${group.name}</div><div class="im-info-group-content im-grid ${isCollapsed ? 'collapsed' : ''}"></div>`;
                const grid = groupEl.querySelector('.im-info-group-content');
                groupChars.sort((a,b) => (a.sort || 99) - (b.sort || 99)).forEach(char => grid.appendChild(this.createCharacterCard(char)));
                container.appendChild(groupEl);
            });

            const unaffiliatedChars = filteredChars.filter(c => c.groupId === null || !groups.some(g => g.id == c.groupId));
            if (unaffiliatedChars.length > 0) {
                const isCollapsed = pluginData.info.unaffiliatedCollapsed || false;
                const groupEl = document.createElement('div');
                groupEl.className = 'im-info-group';
                groupEl.innerHTML = `<div class="im-info-group-header ${isCollapsed ? 'collapsed' : ''}" data-group-id="unaffiliated">${text.unaffiliated}</div><div class="im-info-group-content im-grid ${isCollapsed ? 'collapsed' : ''}"></div>`;
                const grid = groupEl.querySelector('.im-info-group-content');
                unaffiliatedChars.sort((a,b) => (a.sort || 99) - (b.sort || 99)).forEach(char => grid.appendChild(this.createCharacterCard(char)));
                container.appendChild(groupEl);
            }
        },
        renderInfoTab: function() {
            const contentEl = document.getElementById('im-tab-content');
            const { info: text } = pluginData.settings.uiText;
            const { filters } = pluginData.runtime;

            // Render static parts
            contentEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                    <h2>${pluginData.settings.uiText.tabs.info}</h2>
                    <div style="display: flex; flex-grow: 1; justify-content: flex-end; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <input type="search" id="im-info-search" class="im-input" placeholder="${text.searchPlaceholder}" value="${filters.search}" style="max-width: 200px;">
                        <select id="im-info-status-filter" class="im-select" title="${text.filterStatus}" style="max-width: 120px;">
                            <option value="all" ${filters.status === 'all' ? 'selected' : ''}>${text.filterAll}</option>
                            <option value="active" ${filters.status === 'active' ? 'selected' : ''}>${text.active}</option>
                            <option value="inactive" ${filters.status === 'inactive' ? 'selected' : ''}>${text.inactive}</option>
                            <option value="user" ${filters.status === 'user' ? 'selected' : ''}>${text.user}</option>
                        </select>
                        <input type="text" id="im-info-stat-filter" class="im-input" placeholder="${text.filterStat}" value="${filters.stat}" style="max-width: 180px;">
                        <label title="${text.reactivateInactiveCharsToggle}" style="cursor: pointer; color: inherit; user-select: none; display:flex; align-items:center; gap: 5px;">
                            <input type="checkbox" id="im-reactivate-toggle" ${pluginData.settings.functionality.reactivateInactiveChars ? 'checked' : ''}>${text.reactivateInactiveCharsToggle}
                        </label>
                        <button id="im-add-char-btn" class="im-button">${text.newChar}</button>
                    </div>
                </div>
                <div id="im-info-container"></div>`;

            // Render dynamic character list
            this.renderCharacterList();

            // Add event listeners
            document.getElementById('im-reactivate-toggle').onchange = (e) => {
                pluginData.settings.functionality.reactivateInactiveChars = e.target.checked;
                logMessage('execution', `비활성 인물 자동 활성화 설정이 ${e.target.checked ? '활성화' : '비활성화'}되었습니다.`);
                debouncedSaveData();
            };
            document.getElementById('im-add-char-btn').onclick = () => {
                const newChar = { id: Date.now() + Math.random(), name: '새 인물', stats: [{name: '호감도', value: 50}], status: 'inactive', memo: '', memoActive: true, location: '', groupId: null, sort: 99, relationships: {} };
                pluginData.info.characters.push(newChar);
                logMessage('changes', `새 인물 '${newChar.name}' 추가됨.`);
                debouncedSaveData();
                updateLorebookOnUserChange();
                this.renderCharacterList();
            };

            const applyFilters = () => {
                pluginData.runtime.filters.search = document.getElementById('im-info-search').value;
                pluginData.runtime.filters.status = document.getElementById('im-info-status-filter').value;
                pluginData.runtime.filters.stat = document.getElementById('im-info-stat-filter').value;
                logMessage('execution', `필터 적용: 검색='${pluginData.runtime.filters.search}', 상태='${pluginData.runtime.filters.status}', 스탯='${pluginData.runtime.filters.stat}'`);
                this.renderCharacterList();
            };
            document.getElementById('im-info-search').addEventListener('input', applyFilters);
            document.getElementById('im-info-status-filter').addEventListener('change', applyFilters);
            document.getElementById('im-info-stat-filter').addEventListener('input', applyFilters);

            contentEl.addEventListener('click', (e) => {
                const target = e.target;
                if (target.classList.contains('im-info-group-header')) {
                    const groupId = target.dataset.groupId;
                    if (groupId === 'unaffiliated') {
                        pluginData.info.unaffiliatedCollapsed = !pluginData.info.unaffiliatedCollapsed;
                    } else {
                        const group = pluginData.info.groups.find(g => g.id == groupId);
                        if (group) group.collapsed = !group.collapsed;
                    }
                    target.classList.toggle('collapsed');
                    target.nextElementSibling.classList.toggle('collapsed');
                    debouncedSaveData();
                    return;
                }

                const card = target.closest('.im-card');
                if (!card) return;
                const charId = parseFloat(card.dataset.id);
                const char = pluginData.info.characters.find(c => c.id === charId);
                if (!char) return;

                if (target.classList.contains('remove-char-btn')) {
                    if (confirm(`'${char.name}'을(를) 정말 삭제하시겠습니까?`)) {
                        pluginData.info.characters = pluginData.info.characters.filter(c => c.id !== charId);
                        logMessage('changes', `인물 '${char.name}' 삭제됨.`);
                        this.renderCharacterList();
                        debouncedSaveData();
                        updateLorebookOnUserChange();
                    }
                } else if (target.classList.contains('remove-stat-btn')) {
                    const removedStatName = char.stats[target.dataset.index].name;
                    char.stats.splice(target.dataset.index, 1);
                    logMessage('changes', `인물 '${char.name}'의 스탯 '${removedStatName}' 삭제됨.`);
                    this.renderCharacterList();
                    debouncedSaveData();
                    updateLorebookOnUserChange();
                }
            });

            contentEl.addEventListener('change', (e) => {
                const target = e.target;
                let modified = false;
                let shouldReRenderList = false;

                const card = target.closest('.im-card');
                if (!card) return;
                const charId = parseFloat(card.dataset.id);
                const char = pluginData.info.characters.find(c => c.id === charId);
                if (!char) return;

                if (target.classList.contains('char-prop')) {
                    const prop = target.dataset.prop;
                    if (target.type === 'checkbox') {
                        char[prop] = target.checked;
                    } else {
                        const value = target.value;
                        if (prop === 'groupId') {
                            // [Problem 1 Fix] Use parseFloat to correctly handle numeric IDs from string values
                            char[prop] = value === 'null' ? null : parseFloat(value);
                            shouldReRenderList = true;
                        } else {
                            char[prop] = (target.type === 'number') ? parseInt(value, 10) : value;
                        }
                    }
                    modified = true;
                } else if (target.classList.contains('stat-name')) {
                    char.stats[target.dataset.index].name = target.value;
                    modified = true;
                } else if (target.classList.contains('stat-value-input')) {
                    let value = parseInt(target.value, 10);
                    value = Math.max(0, Math.min(100, isNaN(value) ? 0 : value));
                    char.stats[target.dataset.index].value = value;
                    target.value = value;
                    const slider = target.previousElementSibling;
                    if(slider && slider.type === 'range') slider.value = value;
                    modified = true;
                } else if (target.classList.contains('stat-count-input')) {
                    char.stats = char.stats || [];
                    const currentCount = char.stats.length;
                    const newCount = parseInt(target.value, 10);
                    if (!isNaN(newCount) && newCount >= 0) {
                        if (newCount > currentCount) {
                            for (let i = 0; i < newCount - currentCount; i++) char.stats.push({ name: text.newStatName, value: 50 });
                        } else if (newCount < currentCount) {
                            char.stats.splice(newCount);
                        }
                        logMessage('changes', `'${char.name}'의 스탯 개수가 ${currentCount}에서 ${newCount}로 변경됨.`);
                        shouldReRenderList = true;
                        modified = true;
                    }
                }

                if (shouldReRenderList) {
                    this.renderCharacterList();
                }
                if (modified) {
                    debouncedSaveData();
                    updateLorebookOnUserChange();
                }
            });

            contentEl.addEventListener('input', (e) => {
                const target = e.target;
                if (target.classList.contains('stat-value-slider')) {
                    target.nextElementSibling.value = target.value;
                    const card = target.closest('.im-card');
                    if (!card) return;
                    const charId = parseFloat(card.dataset.id);
                    const char = pluginData.info.characters.find(c => c.id === charId);
                    if (!char) return;
                    char.stats[e.target.dataset.index].value = parseInt(e.target.value, 10);
                    debouncedSaveData();
                    updateLorebookOnUserChange();
                }
            });
        },
        createCharacterCard: function(char) {
            const { info: text } = pluginData.settings.uiText; const groups = pluginData.info.groups || [];
            const card = document.createElement('div'); card.className = 'im-card'; card.dataset.id = char.id;
            let statsHtml = (char.stats || []).map((stat, index) => `<div style="display:flex; align-items:center; gap:5px; margin-bottom:5px;"><input type="text" class="im-input stat-name" value="${stat.name}" data-index="${index}" style="flex:1;" title="수정하려면 입력"><input type="range" class="stat-value-slider" value="${stat.value}" min="0" max="100" data-index="${index}" style="flex:2;"><input type="number" class="im-input stat-value-input" min="0" max="100" value="${stat.value}" data-index="${index}" style="width: 60px; text-align: right;"><button class="im-button danger remove-stat-btn" data-index="${index}">-</button></div>`).join('');
            let groupOptions = `<option value="null" ${char.groupId === null ? 'selected' : ''}>${text.unaffiliated}</option>` + groups.map(g => `<option value="${g.id}" ${char.groupId == g.id ? 'selected' : ''}>${g.name}</option>`).join('');
            card.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;"><input type="text" class="im-input char-prop" value="${char.name}" data-prop="name" placeholder="${text.charName}" style="font-size: 1.2em; font-weight: bold;" title="수정하려면 입력"><button class="im-button danger remove-char-btn" style="margin-left:10px;">X</button></div><div style="display:flex; gap:10px; margin-bottom:10px;"><select class="im-select char-prop" data-prop="status" title="${text.status}"><option value="active" ${char.status === 'active' ? 'selected' : ''}>${text.active}</option><option value="inactive" ${char.status === 'inactive' ? 'selected' : ''}>${text.inactive}</option><option value="user" ${char.status === 'user' ? 'selected' : ''}>${text.user}</option></select><select class="im-select char-prop" data-prop="groupId" title="${text.affiliation}">${groupOptions}</select><input type="number" class="im-input char-prop" value="${char.sort || 99}" data-prop="sort" title="${text.sort}"></div><input type="text" class="im-input char-prop" data-prop="location" value="${char.location || ''}" placeholder="${text.location}" title="${text.location}"><div style="margin-top:15px; display: flex; align-items: center; gap: 5px;"><label>${text.statCount}</label><input type="number" class="im-input stat-count-input" value="${(char.stats || []).length}" min="0" style="width: 70px;"></div><div class="stats-container" style="margin-top:5px;">${statsHtml}</div><div style="margin-top:10px; display:flex; align-items:center; gap: 8px;"><label for="memo-toggle-${char.id}" style="cursor:pointer;">${text.memoActive}</label><input type="checkbox" id="memo-toggle-${char.id}" class="char-prop" data-prop="memoActive" ${char.memoActive ? 'checked' : ''} style="width: 20px; height: 20px;"></div><textarea class="im-textarea char-prop" data-prop="memo" placeholder="${text.memo}" style="margin-top:5px; min-height: 80px;" title="수정하려면 입력">${char.memo || ''}</textarea>`;
            return card;
        },
        renderGroupsTab: function() {
            const contentEl = document.getElementById('im-tab-content'); const { groups: text } = pluginData.settings.uiText;
            contentEl.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;"><h2>${pluginData.settings.uiText.tabs.groups}</h2><button id="im-add-group-btn" class="im-button">${text.newGroup}</button></div><div id="im-groups-list" class="im-grid"></div>`;
            const listEl = document.getElementById('im-groups-list');
            (pluginData.info.groups || []).forEach(group => {
                if (!group) return;
                const card = document.createElement('div');
                card.className = 'im-card';
                card.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><input type="text" class="im-input group-name" value="${group.name}" placeholder="${text.groupName}"><button class="im-button danger delete-group-btn" data-id="${group.id}" style="margin-left:10px;">삭제</button></div>`;
                card.querySelector('.group-name').addEventListener('change', (e) => { group.name = e.target.value; debouncedSaveData(); updateLorebookOnUserChange(); });
                card.querySelector('.delete-group-btn').addEventListener('click', (e) => { if (confirm(text.deleteConfirm.replace('{groupName}', group.name))) { pluginData.info.characters.forEach(c => { if(c.groupId == group.id) c.groupId = null; }); pluginData.info.groups = pluginData.info.groups.filter(g => g.id != group.id); debouncedSaveData(); updateLorebookOnUserChange(); this.renderGroupsTab(); } });
                listEl.appendChild(card);
            });
            document.getElementById('im-add-group-btn').onclick = () => { pluginData.info.groups.push({ id: Date.now() + Math.random(), name: '새 소속' }); debouncedSaveData(); updateLorebookOnUserChange(); this.renderGroupsTab(); };
        },
        renderSaveLoadTab: function() {
            const contentEl = document.getElementById('im-tab-content'); const { saveLoad: text } = pluginData.settings.uiText;
            contentEl.innerHTML = `<h2>${pluginData.settings.uiText.tabs.saveLoad}</h2><div style="margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 20px;"><h3>플러그인 전체 데이터 백업/복원</h3><p>현재 캐릭터의 모든 정보, 설정, 세이브 슬롯을 포함한 플러그인 전체 데이터를 파일로 저장하거나 불러옵니다.</p><button id="im-save-file-btn" class="im-button success">${text.saveToFile}</button><button id="im-load-file-btn" class="im-button">${text.loadFromFile}</button><input type="file" id="im-file-input" style="display: none;" accept=".json"></div><h3>캐릭터 정보 슬롯</h3><p>현재 캐릭터의 '정보' 탭 내용만 슬롯에 저장하거나 불러옵니다.</p><div id="im-saveload-list"></div><button id="im-add-slot-btn" class="im-button" style="margin-top: 10px;">${text.addSlot}</button>`;
            const listEl = document.getElementById('im-saveload-list');
            (pluginData.saveSlots || []).forEach(slot => { const slotEl = document.createElement('div'); slotEl.className = 'im-saveload-slot'; slotEl.innerHTML = `<div style="flex: 1;"><input type="text" class="im-input slot-name" value="${slot.name}"><div style="font-size: 0.9em; color: #666; margin-top: 5px;">${slot.timestamp ? new Date(slot.timestamp).toLocaleString() : '비어있음'}</div></div><div class="im-saveload-controls" style="display: flex; gap: 5px;"><button class="im-button success save-btn">${text.save}</button><button class="im-button load-btn" ${!slot.data ? 'disabled' : ''}>${text.load}</button><button class="im-button danger delete-btn">${text.delete}</button></div>`; listEl.appendChild(slotEl); slotEl.querySelector('.save-btn').onclick = () => { const dataToSave = { info: pluginData.info }; slot.data = JSON.stringify(dataToSave); slot.timestamp = new Date().toISOString(); debouncedSaveData(); this.renderSaveLoadTab(); }; slotEl.querySelector('.load-btn').onclick = () => { if (slot.data && confirm(text.loadConfirm)) { const loadedData = JSON.parse(slot.data); pluginData.info = loadedData.info; debouncedSaveData(); updateLorebookOnUserChange(); this.switchTab('info'); } }; slotEl.querySelector('.slot-name').onchange = (e) => { slot.name = e.target.value; debouncedSaveData(); }; slotEl.querySelector('.delete-btn').onclick = () => { if (confirm(text.deleteConfirm)) { slot.data = null; slot.timestamp = null; debouncedSaveData(); this.renderSaveLoadTab(); } }; });
            document.getElementById('im-add-slot-btn').onclick = () => { pluginData.saveSlots.push({ id: Date.now(), name: text.slotDefaultName, timestamp: null, data: null }); debouncedSaveData(); this.renderSaveLoadTab(); };
            document.getElementById('im-save-file-btn').onclick = () => { const dataStr = JSON.stringify(pluginData, null, 2); const blob = new Blob([dataStr], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `IM_backup_${currentCharacterId}_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); };
            const fileInput = document.getElementById('im-file-input'); document.getElementById('im-load-file-btn').onclick = () => fileInput.click();
            fileInput.onchange = (e) => { const file = e.target.files[0]; if (file && confirm(text.fileLoadConfirm)) { const reader = new FileReader(); reader.onload = (event) => { try { const loadedData = JSON.parse(event.target.result); if (loadedData.settings && loadedData.info) { pluginData = loadedData; pluginData.runtime = { autoUpdateEnabled: false, filters: { search: '', status: 'all', stat: '' } }; saveData(); alert('데이터를 성공적으로 불러왔습니다. UI를 갱신합니다.'); this.updateUI(); } else { alert('유효하지 않은 파일 형식입니다.'); } } catch (err) { alert('파일을 읽는 중 오류가 발생했습니다.'); console.error(err); } }; reader.readAsText(file); } fileInput.value = ''; };
        },
        createDraggableWindow: function(url, title) { const popup = document.createElement('div'); popup.className = 'im-popup-window'; popup.style.top = '20%'; popup.style.left = '20%'; popup.style.width = '60%'; popup.style.height = '60%'; popup.innerHTML = `<div class="im-popup-header"><span>${title}</span><button style="background:none; border:none; font-size:1.2em; cursor:pointer;">×</button></div><div class="im-popup-content"><iframe class="im-popup-iframe" src="${url}"></iframe></div>`; document.body.appendChild(popup); const header = popup.querySelector('.im-popup-header'); header.querySelector('button').onclick = () => popup.remove(); let isDragging = false, offset = {x: 0, y: 0}; header.addEventListener('mousedown', (e) => { isDragging = true; const rect = popup.getBoundingClientRect(); offset = { x: e.clientX - rect.left, y: e.clientY - rect.top }; header.style.cursor = 'grabbing'; }); document.addEventListener('mousemove', (e) => { if (!isDragging) return; popup.style.left = `${e.clientX - offset.x}px`; popup.style.top = `${e.clientY - offset.y}px`; }); document.addEventListener('mouseup', () => { isDragging = false; header.style.cursor = 'move'; }); },
        renderLinksTab: function() { const contentEl = document.getElementById('im-tab-content'); const { links: text } = pluginData.settings.uiText; contentEl.innerHTML = `<h2>${pluginData.settings.uiText.tabs.links}</h2><div id="im-links-list"></div><button id="im-add-link-btn" class="im-button" style="margin-top: 10px;">${text.newLink}</button>`; const listEl = document.getElementById('im-links-list'); (pluginData.externalLinks || []).forEach((link, index) => { const itemEl = document.createElement('div'); itemEl.className = 'im-link-item'; itemEl.innerHTML = `<input type="text" class="im-input link-name" value="${link.name || ''}" placeholder="${text.linkName}" style="flex: 1;"><input type="text" class="im-input link-url" value="${link.url || ''}" placeholder="${text.linkUrl}" style="flex: 2;"><button class="im-button success open-link-btn">${text.open}</button><button class="im-button danger delete-link-btn">${text.delete}</button>`; itemEl.querySelector('.link-name').addEventListener('change', e => { link.name = e.target.value; debouncedSaveData(); }); itemEl.querySelector('.link-url').addEventListener('change', e => { link.url = e.target.value; debouncedSaveData(); }); itemEl.querySelector('.open-link-btn').addEventListener('click', () => { if(link.url) this.createDraggableWindow(link.url, link.name || 'External Link'); }); itemEl.querySelector('.delete-link-btn').addEventListener('click', () => { if (confirm(text.deleteConfirm)) { pluginData.externalLinks.splice(index, 1); debouncedSaveData(); this.renderLinksTab(); } }); listEl.appendChild(itemEl); }); document.getElementById('im-add-link-btn').onclick = () => { pluginData.externalLinks = pluginData.externalLinks || []; pluginData.externalLinks.push({ name: '', url: '' }); debouncedSaveData(); this.renderLinksTab(); }; },
        renderUiTab: function() { const contentEl = document.getElementById('im-tab-content'); const { ui: text } = pluginData.settings.uiText; const { uiStyles } = pluginData.settings; contentEl.innerHTML = `<h2>${pluginData.settings.uiText.tabs.ui}</h2><div class="im-grid" style="grid-template-columns: 1fr 1fr;"><div class="im-card"><label for="im-panel-bg">${text.panelBg}</label><input type="color" id="im-panel-bg" class="im-input ui-style-input" data-path="uiStyles.panelBg" value="${uiStyles.panelBg}"></div><div class="im-card"><label for="im-header-bg">${text.headerBg}</label><input type="text" id="im-header-bg" class="im-input ui-style-input" data-path="uiStyles.headerBg" value="${uiStyles.headerBg}"></div><div class="im-card"><label for="im-nav-bg">${text.navBg}</label><input type="color" id="im-nav-bg" class="im-input ui-style-input" data-path="uiStyles.navBg" value="${uiStyles.navBg}"></div><div class="im-card"><label for="im-card-bg">${text.cardBg}</label><input type="color" id="im-card-bg" class="im-input ui-style-input" data-path="uiStyles.cardBg" value="${uiStyles.cardBg}"></div><div class="im-card"><label for="im-input-bg">${text.inputBg}</label><input type="color" id="im-input-bg" class="im-input ui-style-input" data-path="uiStyles.inputBg" value="${uiStyles.inputBg}"></div><div class="im-card"><label for="im-font-size">${text.fontSize}</label><input type="text" id="im-font-size" class="im-input ui-style-input" data-path="uiStyles.fontSize" value="${uiStyles.fontSize}"></div><div class="im-card"><label for="im-text-color">${text.textColor}</label><input type="color" id="im-text-color" class="im-input ui-style-input" data-path="uiStyles.textColor" value="${uiStyles.textColor}"></div><div class="im-card"><label for="im-input-text-color">${text.inputTextColor}</label><input type="color" id="im-input-text-color" class="im-input ui-style-input" data-path="uiStyles.inputTextColor" value="${uiStyles.inputTextColor}"></div></div><div class="im-card" style="margin-top: 20px;"><label for="im-panel-bg-image">${text.panelBgImage}</label><input type="text" id="im-panel-bg-image" class="im-input ui-style-input" data-path="uiStyles.panelBgImage" value="${uiStyles.panelBgImage}" placeholder="https://example.com/image.png"></div>`; contentEl.querySelectorAll('.ui-style-input').forEach(input => { input.addEventListener('change', e => { const path = e.target.dataset.path.split('.'); let current = pluginData.settings; for (let i = 0; i < path.length - 1; i++) current = current[path[i]]; current[path[path.length - 1]] = e.target.value; debouncedSaveData(); this.updateUI(); }); }); },
        renderSettingsTab: function() {
            const contentEl = document.getElementById('im-tab-content'); const { settings: text, tabs } = pluginData.settings.uiText; const { functionality, uiText } = pluginData.settings; const icons = functionality.icons || {};
            contentEl.innerHTML = `<h2>${tabs.settings}</h2>
            <div class="im-card" style="margin-bottom: 20px;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><label style="font-weight: bold;">${text.lorebookInstruction}</label><button id="im-reset-lore-btn" class="im-button">${text.resetDefault}</button></div><textarea class="im-textarea setting-input" data-path="functionality.lorebookInstruction" style="height: 200px;">${functionality.lorebookInstruction}</textarea></div>
            <div class="im-card" style="margin-bottom: 20px;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><label style="font-weight: bold;">${text.characterDetailFormat}</label><button id="im-reset-format-btn" class="im-button">${text.resetDefault}</button></div><p style="font-size: 0.9em; color: #666; margin-top: 0;">${text.characterDetailFormatDesc}</p><textarea class="im-textarea setting-input" data-path="functionality.characterDetailFormat" style="height: 100px;">${functionality.characterDetailFormat}</textarea></div>
            <div class="im-card" style="margin-bottom: 20px;"><label style="font-weight: bold;">${text.headerButtons}</label><div style="display: grid; grid-template-columns: auto 1fr 2fr; gap: 10px; align-items: center; margin-top: 10px;">
                <span>${text.buttonNewChat}:</span><input type="text" class="im-input setting-input" data-path="functionality.icons.newChat" value="${icons.newChat}" placeholder="${text.icon}"><input type="text" class="im-input setting-input" data-path="uiText.header.newChat" value="${uiText.header.newChat}" placeholder="${text.text}">
                <span>${text.buttonParse}:</span><input type="text" class="im-input setting-input" data-path="functionality.icons.parse" value="${icons.parse}" placeholder="${text.icon}"><input type="text" class="im-input setting-input" data-path="uiText.header.parseResponse" value="${uiText.header.parseResponse}" placeholder="${text.text}">
                <span>${text.buttonInject}:</span><input type="text" class="im-input setting-input" data-path="functionality.icons.inject" value="${icons.inject}" placeholder="${text.icon}"><input type="text" class="im-input setting-input" data-path="uiText.header.injectLorebook" value="${uiText.header.injectLorebook}" placeholder="${text.text}">
                <span>${text.buttonAuto}:</span><input type="text" class="im-input setting-input" data-path="functionality.icons.auto" value="${icons.auto}" placeholder="${text.icon}"><input type="text" class="im-input setting-input" data-path="uiText.header.autoUpdate" value="${uiText.header.autoUpdate}" placeholder="${text.text}">
                <span>${text.buttonConfig}:</span><input type="text" class="im-input setting-input" data-path="functionality.icons.config" value="${icons.config}" placeholder="${text.icon}"><input type="text" class="im-input setting-input" data-path="uiText.header.config" value="${uiText.header.config}" placeholder="${text.text}">
            </div></div>
            <div class="im-card" style="margin-bottom: 20px;"><label style="font-weight: bold;">${text.summaryTagName}</label><p style="font-size: 0.9em; color: #666; margin-top: 0;">${text.summaryTagDesc}</p><input type="text" class="im-input setting-input" data-path="functionality.summaryTagName" value="${functionality.summaryTagName}" style="margin-top: 10px;"></div>
            <div class="im-card" style="margin-bottom: 20px;"><label style="font-weight: bold;">${text.logSettings}</label><div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;"><div style="display:flex; align-items:center; gap: 10px;"><input type="checkbox" id="im-enable-logging" class="setting-input" data-path="functionality.enableLogging" ${functionality.enableLogging ? 'checked' : ''}><label for="im-enable-logging">${text.enableLogging}</label></div><div style="display:flex; align-items:center; gap: 10px;"><label for="im-max-log-entries">${text.maxLogEntries}</label><input type="number" id="im-max-log-entries" class="im-input setting-input" data-path="functionality.maxLogEntries" value="${functionality.maxLogEntries}" style="width: 100px;"></div></div></div>
            <div class="im-card" style="margin-top: 20px; border-color: #ef4444;"><h3 style="color: #ef4444;">위험 구역</h3><p>플러그인의 모든 데이터(인물 정보, 그룹, 세이브 슬롯, 설정 등)를 초기 상태로 되돌립니다. 이 작업은 되돌릴 수 없습니다.</p><button id="im-reset-all-data-btn" class="im-button danger">${text.resetAllData}</button></div>`;

            document.getElementById('im-reset-lore-btn').onclick = () => { if(confirm('정말로 로어북 지침을 기본값으로 되돌리시겠습니까?')) { pluginData.settings.functionality.lorebookInstruction = DEFAULT_SETTINGS.functionality.lorebookInstruction; debouncedSaveData(); updateLorebookOnUserChange(); this.renderSettingsTab(); } };
            document.getElementById('im-reset-format-btn').onclick = () => { if(confirm('정말로 캐릭터 정보 형식을 기본값으로 되돌리시겠습니까?')) { pluginData.settings.functionality.characterDetailFormat = DEFAULT_SETTINGS.functionality.characterDetailFormat; debouncedSaveData(); updateLorebookOnUserChange(); this.renderSettingsTab(); } };

            document.getElementById('im-reset-all-data-btn').onclick = () => {
                if (confirm('정말로 플러그인의 모든 데이터를 초기 상태로 되돌리시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                    logMessage('execution', '모든 데이터 초기화가 시작되었습니다.');
                    initializePluginData();
                    saveData();
                    alert('플러그인의 모든 데이터가 초기화되었습니다.');
                    this.updateUI();
                }
            };

            contentEl.querySelectorAll('.setting-input').forEach(input => { input.addEventListener('change', e => { const path = e.target.dataset.path.split('.'); let current = pluginData.settings; for (let i = 0; i < path.length - 1; i++) current = current[path[i]]; const prop = path[path.length - 1]; if (e.target.type === 'checkbox') { current[prop] = e.target.checked; } else if (e.target.type === 'number') { current[prop] = parseInt(e.target.value, 10); } else { current[prop] = e.target.value; } debouncedSaveData(); this.updateUI(); }); });
        },
        renderHotkeysTab: function() { const contentEl = document.getElementById('im-tab-content'); const { hotkeys: text } = pluginData.settings.uiText; const hotkeys = pluginData.settings.functionality.hotkeys || {}; contentEl.innerHTML = `<h2>${pluginData.settings.uiText.tabs.hotkeys}</h2><p>입력창을 클릭한 후 원하는 단축키를 누르세요. 초기화하려면 입력창을 더블클릭하세요.</p><div class="im-grid" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));">${Object.keys(hotkeys).map(key => `<div class="im-card"><label for="hotkey-${key}">${text[key]}</label><input type="text" id="hotkey-${key}" class="im-input hotkey-input" data-key="${key}" value="${hotkeys[key] || ''}" placeholder="${text.save}" readonly></div>`).join('')}</div>`; contentEl.querySelectorAll('.hotkey-input').forEach(input => { input.addEventListener('keydown', e => { e.preventDefault(); const key = e.key.toLowerCase(); if (['control', 'alt', 'shift', 'meta'].includes(key)) return; let combo = []; if (e.ctrlKey) combo.push('Ctrl'); if (e.shiftKey) combo.push('Shift'); if (e.altKey) combo.push('Alt'); const finalKey = (key === ' ') ? 'Space' : e.code.replace('Key', '').replace('Digit', ''); combo.push(finalKey); const comboString = combo.join('+'); input.value = comboString; pluginData.settings.functionality.hotkeys[input.dataset.key] = comboString; debouncedSaveData(); setupHotkeys(); }); input.addEventListener('dblclick', e => { input.value = ""; pluginData.settings.functionality.hotkeys[input.dataset.key] = ""; debouncedSaveData(); setupHotkeys(); }); }); },
        renderLogTab: function() { const { settings: text } = pluginData.settings.uiText; const { log: logText } = pluginData.settings.uiText.tabs; const logTypes = { autoUpdate: "자동 업데이트 로그", changes: "변화 기록 로그", execution: "실행 로그", lastParsed: "마지막 분석 정보" }; const contentEl = document.getElementById('im-tab-content'); contentEl.innerHTML = `<h2>${logText}</h2><div class="im-log-container">${Object.keys(logTypes).map(logType => `<div class="im-log-column"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><h3>${logTypes[logType]}</h3><button class="im-button danger clear-log-btn" data-log-type="${logType}">${text.clearAll}</button></div><div class="im-log-box" id="im-log-box-${logType}">${(pluginData.logs[logType] || []).map(log => `<div class="im-log-entry ${log.level}"><span>[${log.timestamp}]<br><pre style="white-space: pre-wrap; margin:0;">${log.message}</pre></span><button class="im-button danger" style="padding: 2px 5px; align-self: flex-start;" onclick="InformationManager.deleteLogEntry('${logType}', ${log.id})">X</button></div>`).join('')}</div></div>`).join('')}</div>`; contentEl.querySelectorAll('.clear-log-btn').forEach(btn => { btn.onclick = (e) => { const logType = e.target.dataset.logType; const logName = logTypes[logType]; if (confirm(`'${logName}' 로그를 모두 삭제하시겠습니까?`)) { pluginData.logs[logType] = []; debouncedSaveData(); this.renderLogTab(); } }; }); }
    };

    InformationManager.deleteLogEntry = function(logType, logId) { pluginData.logs[logType] = pluginData.logs[logType].filter(log => log.id !== logId); debouncedSaveData(); if (uiController.isOpen && uiController.currentTab === 'log') { uiController.renderLogTab(); } };

    // ================== 단축키 처리 ==================
    let hotkeyListener = null;
    function setupHotkeys() {
        if (hotkeyListener) document.removeEventListener('keydown', hotkeyListener);

        hotkeyListener = (e) => {
            const hotkeys = pluginData.settings.functionality.hotkeys;
            if (!hotkeys || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) { return; }
            const key = e.key.toLowerCase();
            if (['control', 'alt', 'shift', 'meta'].includes(key)) return;
            let combo = [];
            if (e.ctrlKey) combo.push('Ctrl');
            if (e.shiftKey) combo.push('Shift');
            if (e.altKey) combo.push('Alt');
            const finalKey = (key === ' ') ? 'Space' : e.code.replace('Key', '').replace('Digit', '');
            combo.push(finalKey);
            const pressedCombo = combo.join('+');

            for (const action in hotkeys) {
                if (hotkeys[action] === pressedCombo) {
                    e.preventDefault();
                    logMessage('execution', `단축키 실행: ${action}`);
                    switch (action) {
                        case 'toggleWindow': uiController.toggleWindow(); break;
                        case 'parseResponse': parseLastResponse(); break;
                        case 'injectLorebook': injectToLorebook(); break;
                        case 'toggleAutoInject': uiController.toggleAutoUpdate(); break;
                    }
                }
            }
        };
        document.addEventListener('keydown', hotkeyListener);
        logMessage('execution', '단축키 리스너 설정됨.');
    }

    // ================== 플러그인 초기화 및 API 등록 ==================
    function initPlugin() {
        if (!globalThis.__pluginApis__) { setTimeout(initPlugin, 200); return; }
        const onDomReady = () => {
            if (document.body) {
                initializePluginData(); createPluginUI(); onCharacterChange(); setupHotkeys();
                globalThis.__pluginApis__.addRisuReplacer('afterRequest', handleAfterRequest);
                setInterval(onCharacterChange, 3000);
                globalThis.__pluginApis__.onUnload(() => { saveData(); if (hotkeyListener) document.removeEventListener('keydown', hotkeyListener); });
                console.log('정보 관리 플러그인 v1.0이 시작되었습니다!'); logMessage('execution', '플러그인 초기화 완료.');
            } else { setTimeout(onDomReady, 200); }
        };
        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', onDomReady); } else { onDomReady(); }
    }

    initPlugin();

})();