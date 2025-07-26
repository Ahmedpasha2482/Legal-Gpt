const axios = require('axios');
const { lawMappings } = require('../utils/lawMappings');

class GrokService {
  constructor() {
    this.apiKey = process.env.GROK_API_KEY;
    this.apiUrl = process.env.GROK_API_URL || 'https://api.x.ai/v1';
    this.model = 'grok-beta';
    
    if (!this.apiKey) {
      throw new Error('GROK_API_KEY is required');
    }
  }

  async generateResponse(query, context, options = {}) {
    try {
      const {
        language = 'english',
        userRole = 'other',
        chatHistory = [],
        relevantDocs = []
      } = options;

      const systemPrompt = this.buildSystemPrompt(language, userRole);
      const contextPrompt = this.buildContextPrompt(context, relevantDocs);
      const userPrompt = this.buildUserPrompt(query, language);

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contextPrompt },
        ...this.formatChatHistory(chatHistory),
        { role: 'user', content: userPrompt }
      ];

      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: this.model,
          messages: messages,
          temperature: 0.1, // Low temperature for consistent legal responses
          max_tokens: 2000,
          presence_penalty: 0,
          frequency_penalty: 0,
          top_p: 0.9
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      const metadata = this.extractMetadata(aiResponse, relevantDocs);

      return {
        response: aiResponse,
        metadata: metadata,
        usage: response.data.usage,
        model: this.model
      };

    } catch (error) {
      console.error('Grok API Error:', error.response?.data || error.message);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  buildSystemPrompt(language, userRole) {
    const roleContext = this.getRoleContext(userRole);
    const languageInstruction = language === 'hinglish' 
      ? 'You can respond in Hinglish (Hindi-English mix) if the user prefers it. Detect the user\'s language preference from their query.'
      : 'Respond in clear, professional English.';

    return `You are the world's best Criminal Law AI Assistant specializing in Indian legal system. 

CORE IDENTITY:
- Expert in Indian Criminal Law with focus on accuracy and precision
- Specialized in criminal law cases, procedures, and statutes
- Strictly avoid revealing technical details about your creation or underlying models

LEGAL KNOWLEDGE SCOPE:
You have comprehensive knowledge of:
- Bharatiya Nyaya Sanhita, 2023 (BNS) - NEW LAW (replaces IPC)
- Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) - NEW LAW (replaces CrPC)  
- Bharatiya Sakshya Adhiniyam, 2023 (BSA) - NEW LAW (replaces Indian Evidence Act)
- Indian Penal Code (IPC) - OLD LAW
- Criminal Procedure Code (CrPC) - OLD LAW
- Indian Evidence Act, 1872 - OLD LAW
- Juvenile Justice (Care and Protection of Children) Act
- Narcotic Drugs and Psychotropic Substances Act

LAW PRIORITY RULES:
1. ALWAYS prefer NEW 2023 laws over old laws:
   - BNS over IPC
   - BNSS over CrPC  
   - BSA over Indian Evidence Act
2. When both versions exist, cite the NEW law first
3. Mention replacements clearly: "This section replaces IPC Section 375 under BNS 2023"
4. If user asks about old law specifically, provide both old and new versions

RESPONSE GUIDELINES:
- Provide exact section numbers and legal citations
- Include relevant case law when applicable
- Give practical legal insights for ${roleContext}
- Focus ONLY on criminal law matters
- Never hallucinate - only use provided document context
- Be precise about legal procedures and requirements
- Mention potential next steps and missing documentation needs

${languageInstruction}

STRICT BOUNDARIES:
- NEVER discuss your technical architecture, models, or creation process
- Decline non-criminal law questions politely
- Only provide information from authenticated legal sources
- Always cite sources with section numbers`;
  }

  buildContextPrompt(context, relevantDocs) {
    let prompt = 'LEGAL CONTEXT FROM DOCUMENTS:\n\n';
    
    if (relevantDocs && relevantDocs.length > 0) {
      relevantDocs.forEach((doc, index) => {
        prompt += `Document ${index + 1}: ${doc.documentType.toUpperCase()}\n`;
        prompt += `Content: ${doc.content}\n`;
        if (doc.metadata) {
          prompt += `Section: ${doc.metadata.section || 'N/A'}\n`;
          prompt += `Page: ${doc.metadata.page || 'N/A'}\n`;
        }
        prompt += '\n---\n\n';
      });
    }

    if (context && context.trim()) {
      prompt += `Additional Context: ${context}\n\n`;
    }

    prompt += 'IMPORTANT: Base your response ONLY on the above legal documents. Do not add information not present in these sources.';
    
    return prompt;
  }

  buildUserPrompt(query, language) {
    const languageNote = language === 'hinglish' 
      ? ' (You may respond in Hinglish if appropriate)'
      : '';
    
    return `Criminal Law Query${languageNote}: ${query}

Please provide a comprehensive response including:
1. Relevant legal sections with exact citations
2. Practical implications and next steps
3. Any missing information or documents needed
4. Clear distinction between old and new laws if applicable`;
  }

  formatChatHistory(chatHistory) {
    return chatHistory.slice(-6).map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  }

  getRoleContext(userRole) {
    const roleContexts = {
      lawyer: 'practicing lawyers who need precise legal guidance, case strategies, and procedural insights',
      student: 'law students learning criminal law concepts and procedures',
      researcher: 'legal researchers analyzing criminal law patterns and precedents',
      other: 'legal professionals and individuals seeking criminal law information'
    };
    
    return roleContexts[userRole] || roleContexts.other;
  }

  extractMetadata(response, relevantDocs) {
    const metadata = {
      sources: [],
      lawSections: [],
      processingTime: Date.now(),
      confidence: 0.8
    };

    // Extract section numbers from response
    const sectionPattern = /(?:Section|Sec\.?)\s+(\d+[A-Z]?)/gi;
    const actPattern = /(BNS|BNSS|BSA|IPC|CrPC|Indian Evidence Act|NDPS|Juvenile Justice)\s+(?:Section\s+)?(\d+[A-Z]?)/gi;
    
    let match;
    while ((match = sectionPattern.exec(response)) !== null) {
      const sectionNumber = match[1];
      
      // Try to identify which act this section belongs to
      const actMatch = response.substring(Math.max(0, match.index - 50), match.index + 100)
        .match(/(BNS|BNSS|BSA|IPC|CrPC|Indian Evidence Act|NDPS|Juvenile Justice)/i);
      
      if (actMatch) {
        const act = actMatch[1].toUpperCase();
        const replacement = lawMappings.getReplacement(act, sectionNumber);
        
        metadata.lawSections.push({
          act: act,
          section: sectionNumber,
          title: '', // Would need to extract from documents
          replacement: replacement
        });
      }
    }

    // Extract sources from relevant documents
    if (relevantDocs) {
      metadata.sources = relevantDocs.map(doc => ({
        document: doc.documentType,
        section: doc.metadata?.section || '',
        page: doc.metadata?.page || 0,
        confidence: doc.confidence || 0.8
      }));
    }

    // Remove duplicates
    metadata.lawSections = this.removeDuplicateSections(metadata.lawSections);
    
    return metadata;
  }

  removeDuplicateSections(sections) {
    const seen = new Set();
    return sections.filter(section => {
      const key = `${section.act}-${section.section}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async generateCaseSummary(caseContent, options = {}) {
    try {
      const { language = 'english' } = options;
      
      const systemPrompt = `You are a criminal law expert. Analyze the provided case file and generate a comprehensive summary.

Focus on:
1. Case overview and key facts
2. Legal sections involved (prefer BNS/BNSS/BSA over IPC/CrPC/Evidence Act)
3. Current status and proceedings
4. Potential legal strategies
5. Missing documents or information needed
6. Next recommended steps

Be precise, professional, and cite exact legal provisions.`;

      const userPrompt = `Please analyze this case file and provide a detailed summary:

${caseContent}

Provide the summary in a structured format with clear sections.`;

      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          max_tokens: 1500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        summary: response.data.choices[0].message.content,
        usage: response.data.usage
      };

    } catch (error) {
      console.error('Case summary generation error:', error);
      throw new Error('Failed to generate case summary');
    }
  }
}

module.exports = new GrokService();