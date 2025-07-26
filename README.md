# 🏛️ Criminal Law AI Chatbot - India's Best Legal Assistant

A world-class AI-powered chatbot specifically designed for Indian Criminal Law, built with cutting-edge RAG (Retrieval Augmented Generation) technology and powered by Grok API.

## 🚀 Features

### 🤖 AI-Powered Legal Assistant
- **Grok API Integration**: Uses advanced AI for human-like, lawyer-grade responses
- **RAG Implementation**: Retrieval Augmented Generation ensures accurate, source-based answers
- **Zero Hallucination**: Responds only from uploaded legal documents and verified sources
- **Multilingual Support**: English and Hinglish support for wider accessibility

### ⚖️ Comprehensive Legal Coverage
- **Latest Laws (2023)**: Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), Bharatiya Sakshya Adhiniyam (BSA)
- **Legacy Laws**: Indian Penal Code (IPC), Criminal Procedure Code (CrPC), Indian Evidence Act 1872
- **Special Acts**: Juvenile Justice Act, NDPS Act, POCSO Act
- **Smart Law Mapping**: Automatic conflict detection and preference for newer laws

### 🔄 Advanced Law Conflict Management
- **Automatic Detection**: Identifies conflicts between old and new laws
- **Smart Recommendations**: Suggests updated law sections
- **Transparent Citations**: Clear indication of law replacements and updates
- **Version Mapping**: Complete mapping between IPC↔BNS, CrPC↔BNSS, Evidence Act↔BSA

### 📁 Document Management
- **PDF Upload & Processing**: Advanced text extraction and chunking
- **Embeddings**: Vector-based document search and retrieval
- **Case File Analysis**: Upload case files for AI-powered analysis
- **Document Library**: Organized storage with search capabilities

### 💬 Professional Chat System
- **Multi-Chat Support**: Handle multiple cases simultaneously
- **Memory Management**: Contextual conversations with history
- **Chat Export**: Download conversations in JSON/PDF format
- **Case Organization**: Tag and categorize legal cases

### 👨‍⚖️ Lawyer-Centric Features
- **Case Summaries**: AI-generated case analysis and summaries
- **Legal Section Identification**: Automatic detection of relevant law sections
- **Next Steps Recommendation**: Suggested legal actions and missing documents
- **Professional Insights**: Tailored advice based on user role (Lawyer/Student/Researcher)

## 🏗️ Technical Architecture

### Backend (Node.js + Express)
```
server/
├── models/          # MongoDB schemas (User, Chat, Document)
├── routes/          # API endpoints (auth, chat, query, documents)
├── services/        # Business logic (Grok API, Document Processing)
├── middleware/      # Authentication, rate limiting, error handling
├── utils/           # Law mappings, utilities
└── uploads/         # File storage
```

### Frontend (React + TypeScript)
```
client/
├── src/
│   ├── components/  # Reusable UI components
│   ├── pages/       # Main application pages
│   ├── services/    # API client and services
│   ├── types/       # TypeScript definitions
│   ├── hooks/       # Custom React hooks
│   └── utils/       # Helper functions
```

### Key Technologies
- **Backend**: Node.js, Express, MongoDB, Mongoose
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **AI**: Grok API (X.AI), OpenAI Embeddings
- **Vector DB**: Pinecone (configurable)
- **Authentication**: JWT with bcrypt
- **File Processing**: PDF parsing, text extraction
- **State Management**: React Query (@tanstack/react-query)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB instance
- Grok API key from X.AI
- OpenAI API key (for embeddings)
- Pinecone account (optional, for vector storage)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd criminal-law-ai-chatbot
```

2. **Install dependencies**
```bash
# Install backend dependencies
npm run install-all
```

3. **Environment Setup**
```bash
# Copy environment template
cp .env.example .env

# Configure your environment variables
# Edit .env with your API keys and database URLs
```

4. **Database Setup**
```bash
# Make sure MongoDB is running
# The application will create collections automatically
```

5. **Start the application**
```bash
# Development mode (both frontend and backend)
npm run dev

# Or start separately
npm run server  # Backend only
npm run client  # Frontend only
```

6. **Production Build**
```bash
npm run build
npm start
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/criminal_law_chatbot

# AI API Keys
GROK_API_KEY=your_grok_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Vector Database (Optional)
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=criminal-law-index

# Security
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12

# File Upload
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=pdf,txt,doc,docx

# CORS
FRONTEND_URL=http://localhost:3000
```

## 📖 Usage Guide

### For Lawyers
1. **Register** with your Bar Council number
2. **Upload case files** for AI analysis
3. **Ask specific legal questions** with context
4. **Get case summaries** with legal section analysis
5. **Download chat transcripts** for client records

### For Law Students
1. **Study legal concepts** with interactive Q&A
2. **Practice with case studies** and scenarios
3. **Learn law section mappings** between old and new acts
4. **Access comprehensive legal database**

### For Legal Researchers
1. **Research legal precedents** and patterns
2. **Analyze law evolution** from old to new acts
3. **Compare legal provisions** across different acts
4. **Generate research reports** with AI assistance

## 🔧 Configuration

### Law Document Processing
The system automatically processes legal documents placed in the `Data/` folder:
- IPC, CrPC, Evidence Act (old laws)
- BNS, BNSS, BSA (new laws - 2023)
- Special acts (NDPS, Juvenile Justice, POCSO)

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

#### Chat & Queries
- `POST /api/query/ask` - Ask legal question
- `POST /api/query/analyze-case` - Analyze case file
- `GET /api/chat` - Get user chats
- `POST /api/chat` - Create new chat

#### Documents
- `POST /api/documents/upload` - Upload documents
- `GET /api/documents` - List documents
- `POST /api/documents/search` - Search in documents

#### Law Mapping
- `GET /api/query/law-mapping/:act/:section` - Get law mapping
- `POST /api/query/law-conflicts` - Check law conflicts

## 🎨 UI/UX Features

### Modern Design
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Clean Interface**: Professional look suitable for legal professionals
- **Dark/Light Mode**: User preference support
- **Accessibility**: WCAG compliant design

### User Experience
- **Fast Responses**: Optimized API calls and caching
- **Real-time Chat**: Instant AI responses with typing indicators
- **File Drag & Drop**: Easy document upload interface
- **Progressive Loading**: Smooth user experience during processing

## 🚀 Deployment

### Production Deployment

#### Using Docker (Recommended)
```bash
# Build and run with Docker
docker-compose up --build
```

#### Manual Deployment
1. **Build the frontend**
```bash
cd client && npm run build
```

2. **Set environment variables**
```bash
export NODE_ENV=production
export MONGODB_URI=your_production_mongodb_uri
export GROK_API_KEY=your_production_grok_key
# ... other environment variables
```

3. **Start the application**
```bash
npm start
```

#### Deploy to Vercel + Render
- **Frontend**: Deploy to Vercel
- **Backend**: Deploy to Render or Railway
- **Database**: MongoDB Atlas

### Environment-Specific Configurations
- **Development**: File-based storage, local MongoDB
- **Staging**: Cloud storage, managed database
- **Production**: CDN, load balancer, database replicas

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure stateless authentication
- **Role-based Access**: Different permissions for lawyers, students, etc.
- **Rate Limiting**: API abuse prevention
- **Input Validation**: XSS and injection protection

### Data Security
- **Encrypted Storage**: Sensitive data encryption
- **Secure File Upload**: File type and size validation
- **HTTPS Only**: SSL/TLS in production
- **Privacy Compliance**: GDPR-ready data handling

## 📊 Monitoring & Analytics

### Performance Monitoring
- **Response Times**: API endpoint performance tracking
- **Error Rates**: Real-time error monitoring
- **Usage Analytics**: User behavior insights
- **System Health**: Server and database monitoring

### Legal Analytics
- **Query Patterns**: Most asked legal questions
- **Document Usage**: Popular legal sections
- **User Engagement**: Chat and document interaction metrics

## 🤝 Contributing

### Development Guidelines
1. **Code Style**: Follow ESLint and Prettier configurations
2. **TypeScript**: Maintain strict type safety
3. **Testing**: Write unit tests for new features
4. **Documentation**: Update README and API docs

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request with clear description

## 📄 Legal Compliance

### Data Privacy
- **No Personal Data Storage**: Only case-related legal information
- **User Consent**: Clear terms of service and privacy policy
- **Data Retention**: Configurable data retention policies
- **Right to Deletion**: User data deletion capabilities

### Legal Disclaimers
- **AI Assistance Only**: Not a replacement for professional legal advice
- **Accuracy Disclaimer**: While AI strives for accuracy, human verification recommended
- **Jurisdiction Specific**: Designed for Indian criminal law only

## 🔮 Roadmap

### Upcoming Features
- [ ] **Voice Input/Output**: Speech recognition and synthesis
- [ ] **Advanced Analytics**: Legal trend analysis and insights
- [ ] **Multi-language Support**: Regional Indian languages
- [ ] **Integration APIs**: Connect with legal practice management tools
- [ ] **Mobile App**: Native mobile applications
- [ ] **Collaborative Features**: Team workspaces for law firms

### Technical Improvements
- [ ] **Performance Optimization**: Faster response times
- [ ] **Advanced Caching**: Redis implementation
- [ ] **Microservices**: Service decomposition for scalability
- [ ] **GraphQL API**: Enhanced API flexibility
- [ ] **Real-time Features**: WebSocket implementation

## 📞 Support

### Documentation
- **API Documentation**: Comprehensive API reference
- **User Guides**: Step-by-step usage instructions
- **Video Tutorials**: Screen-recorded tutorials
- **FAQ**: Common questions and answers

### Community
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community Q&A and discussions
- **Discord Server**: Real-time community support

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Legal Experts**: For providing domain expertise and validation
- **Open Source Community**: For the amazing tools and libraries
- **X.AI (Grok)**: For providing cutting-edge AI capabilities
- **Indian Legal System**: For the comprehensive legal framework

---

**Built with ❤️ for the Indian Legal Community**

*Empowering lawyers, students, and legal professionals with AI-powered criminal law assistance.*