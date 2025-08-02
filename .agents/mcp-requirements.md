# MCP Server Requirements - RoofGuardian Claude Code Integration

## Overview
This document outlines the required MCP (Model Context Protocol) servers for optimal RoofGuardian development with Claude Code's 3-agent system. These servers enable lightning-fast development cycles (2-3 minutes) while maintaining construction industry expertise.

---

## 🚨 **Essential MCP Servers (Required)**

### **1. @anthropic/mcp-github**
**Purpose**: Repository management, branching, commits, PR creation
**Used By**: Code Orchestrator Agent, Context Intelligence Agent

#### Installation
```bash
npm install -g @anthropic/mcp-github
```

#### Configuration
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["@anthropic/mcp-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_github_token_here"
      }
    }
  }
}
```

#### Capabilities
- Automatic branch creation for feature development
- Intelligent commit messages with proper attribution
- Pull request automation with comprehensive descriptions
- Historical analysis for pattern learning
- Repository insights and code quality tracking

#### RoofGuardian Integration
- Construction industry commit message templates
- Automated compliance documentation
- Emergency deployment branch creation
- Safety protocol validation tracking

---

### **2. @anthropic/mcp-playwright**
**Purpose**: Visual testing, screenshot capture, mobile validation
**Used By**: Visual Development Agent

#### Installation
```bash
npm install -g @anthropic/mcp-playwright
npx playwright install
```

#### Configuration
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic/mcp-playwright"],
      "env": {
        "PLAYWRIGHT_BROWSERS_PATH": "/usr/local/bin/playwright"
      }
    }
  }
}
```

#### Capabilities
- Real-time screenshot capture across devices
- Visual regression testing with pixel-perfect comparison
- Mobile device emulation (iPhone, iPad, Android)
- Accessibility compliance validation (WCAG 2.1 AA+)
- Performance monitoring (Core Web Vitals)
- Interactive element testing (touch, gestures, voice)

#### RoofGuardian Integration
- Inspector interface validation on field devices
- Touch target testing for work gloves
- Outdoor visibility simulation (bright sunlight)
- Offline mode testing and validation
- Emergency alert visibility testing

---

### **3. @anthropic/mcp-memory**
**Purpose**: Context intelligence, pattern storage, learning systems
**Used By**: Context Intelligence Agent

#### Installation
```bash
npm install -g @anthropic/mcp-memory
```

#### Configuration
```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["@anthropic/mcp-memory"],
      "env": {
        "MEMORY_STORAGE_PATH": "./claude-memory",
        "MEMORY_ENCRYPTION_KEY": "your_encryption_key_here"
      }
    }
  }
}
```

#### Capabilities
- Perfect project context retention
- Successful pattern recognition and storage
- Development decision history tracking
- AI-powered optimization suggestions
- Cross-session memory persistence

#### RoofGuardian Integration
- Construction industry pattern library
- Inspector workflow optimization memory
- Safety protocol implementation tracking
- Regulatory compliance pattern storage
- Emergency response procedure optimization

---

### **4. @anthropic/mcp-filesystem**
**Purpose**: Multi-file editing, rapid component generation
**Used By**: Code Orchestrator Agent, Visual Development Agent

#### Installation
```bash
npm install -g @anthropic/mcp-filesystem
```

#### Configuration
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@anthropic/mcp-filesystem"],
      "env": {
        "ALLOWED_DIRECTORIES": ["/Users/yourusername/roof-guardian-central"]
      }
    }
  }
}
```

#### Capabilities
- Simultaneous multi-file editing
- Intelligent dependency resolution
- Component template generation
- File structure optimization
- Import/export management

#### RoofGuardian Integration
- Construction industry component templates
- Inspector interface rapid generation
- Mobile-first responsive patterns
- Accessibility compliant templates
- Emergency response component library

---

### **5. @anthropic/mcp-commands**
**Purpose**: Build processes, dev server management, testing
**Used By**: Code Orchestrator Agent, Visual Development Agent

#### Installation
```bash
npm install -g @anthropic/mcp-commands
```

#### Configuration
```json
{
  "mcpServers": {
    "commands": {
      "command": "npx",
      "args": ["@anthropic/mcp-commands"],
      "env": {
        "ALLOWED_COMMANDS": [
          "npm", "yarn", "git", "playwright", "eslint", "typescript"
        ]
      }
    }
  }
}
```

#### Capabilities
- Automated build and test execution
- Development server management
- Hot reload coordination
- Error detection and reporting
- Performance monitoring

#### RoofGuardian Integration
- Construction industry testing patterns
- Mobile performance validation
- Accessibility compliance checking
- Emergency deployment procedures
- Field condition simulation testing

---

## 🎯 **Optional but Recommended MCP Servers**

### **@anthropic/mcp-supabase**
**Purpose**: Database-aware optimizations and real-time sync
**Used By**: Code Orchestrator Agent

#### Installation
```bash
npm install -g @anthropic/mcp-supabase
```

#### Configuration
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["@anthropic/mcp-supabase"],
      "env": {
        "SUPABASE_URL": "your_supabase_url",
        "SUPABASE_ANON_KEY": "your_supabase_anon_key",
        "SUPABASE_SERVICE_ROLE_KEY": "your_service_role_key"
      }
    }
  }
}
```

#### Benefits
- Optimized query generation for construction data
- Real-time subscription management
- Geospatial query optimization (PostGIS)
- Row-level security policy generation
- Performance monitoring and optimization

### **@anthropic/mcp-web-search**
**Purpose**: Documentation lookup and troubleshooting
**Used By**: Context Intelligence Agent

#### Installation
```bash
npm install -g @anthropic/mcp-web-search
```

#### Benefits
- Real-time documentation access
- Construction industry standard lookup
- Regulatory compliance verification
- Technology trend analysis
- Troubleshooting support

---

## 🛠️ **Complete Setup Instructions**

### **Step 1: Global Installation**
```bash
# Install all essential MCP servers
npm install -g @anthropic/mcp-github
npm install -g @anthropic/mcp-playwright
npm install -g @anthropic/mcp-memory
npm install -g @anthropic/mcp-filesystem
npm install -g @anthropic/mcp-commands

# Install optional servers
npm install -g @anthropic/mcp-supabase
npm install -g @anthropic/mcp-web-search

# Install Playwright browsers
npx playwright install
```

### **Step 2: Claude Code Configuration**
Create or update your Claude Code configuration file:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["@anthropic/mcp-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_github_token"
      }
    },
    "playwright": {
      "command": "npx", 
      "args": ["@anthropic/mcp-playwright"]
    },
    "memory": {
      "command": "npx",
      "args": ["@anthropic/mcp-memory"],
      "env": {
        "MEMORY_STORAGE_PATH": "./claude-memory"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["@anthropic/mcp-filesystem"],
      "env": {
        "ALLOWED_DIRECTORIES": ["./"]
      }
    },
    "commands": {
      "command": "npx",
      "args": ["@anthropic/mcp-commands"],
      "env": {
        "ALLOWED_COMMANDS": ["npm", "git", "playwright", "eslint"]
      }
    },
    "supabase": {
      "command": "npx",
      "args": ["@anthropic/mcp-supabase"],
      "env": {
        "SUPABASE_URL": "your_supabase_url",
        "SUPABASE_ANON_KEY": "your_supabase_anon_key"
      }
    }
  }
}
```

### **Step 3: Environment Variables**
Create `.env.local` file with required tokens:

```bash
# GitHub Integration
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here

# Supabase Integration (if using optional server)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Memory Encryption (optional)
MEMORY_ENCRYPTION_KEY=your_encryption_key_here
```

### **Step 4: Testing MCP Server Setup**
```bash
# Test GitHub connection
npx @anthropic/mcp-github test

# Test Playwright installation
npx playwright --version

# Test filesystem access
npx @anthropic/mcp-filesystem test

# Test command execution
npx @anthropic/mcp-commands test npm --version
```

---

## 🚀 **Verification and Testing**

### **Integration Test Commands**
Use these natural language prompts to test the complete setup:

```bash
# Test Code Orchestrator with multi-file editing
"Fix any TypeScript errors in the inspection components"

# Test Visual Development with screenshot capture  
"Validate mobile responsiveness of the property dashboard"

# Test Context Intelligence with pattern learning
"Optimize the photo upload workflow based on best practices"

# Test multi-agent coordination
"Add offline sync to inspector interface with visual validation"
```

### **Expected Results**
- **<30 seconds**: First code changes visible
- **<30 seconds**: Screenshots and visual validation complete
- **<5 seconds**: Context retrieval and pattern suggestions
- **2-3 minutes**: Complete feature development cycle

### **Troubleshooting Common Issues**

#### **GitHub Connection Issues**
```bash
# Verify token permissions
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Test token access
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
```

#### **Playwright Installation Issues**
```bash
# Reinstall browsers
npx playwright install --force

# Check installed browsers
npx playwright install --dry-run
```

#### **Memory Storage Issues**
```bash
# Create memory directory
mkdir -p ./claude-memory
chmod 755 ./claude-memory

# Test memory write access
touch ./claude-memory/test.json
rm ./claude-memory/test.json
```

#### **Filesystem Permission Issues**
```bash
# Verify directory permissions
ls -la ./
chmod 755 ./src

# Test file access
touch ./test-access.txt
rm ./test-access.txt
```

---

## 📊 **Performance Optimization**

### **Recommended System Requirements**
- **CPU**: 8+ cores for parallel testing
- **RAM**: 16GB+ for browser automation
- **Storage**: SSD with 50GB+ free space
- **Network**: Stable internet for GitHub/Supabase integration

### **Performance Tuning**
```json
{
  "playwright": {
    "workers": 4,
    "timeout": 30000,
    "retries": 2
  },
  "memory": {
    "max_storage": "1GB",
    "cleanup_interval": "24h"
  },
  "filesystem": {
    "max_files": 1000,
    "watch_debounce": 300
  }
}
```

---

## 🎯 **RoofGuardian-Specific Optimizations**

### **Construction Industry Patterns**
The MCP servers are pre-configured with:
- Inspector workflow templates
- Mobile-first component patterns
- Safety protocol implementations
- Compliance validation rules
- Emergency response procedures

### **Field Operation Support**
- Offline capability testing
- Touch interface validation
- Weather condition simulation
- Equipment integration testing
- Emergency alert systems

### **Performance Monitoring**
- Real-time performance metrics
- Construction industry benchmarks
- Field device optimization
- Network condition handling
- Battery usage optimization

---

## 📞 **Support and Resources**

### **Documentation Links**
- [MCP Server Documentation](https://docs.anthropic.com/mcp)
- [Claude Code Integration Guide](https://docs.anthropic.com/claude-code)
- [Playwright Testing Guide](https://playwright.dev/)
- [GitHub API Documentation](https://docs.github.com/en/rest)

### **Troubleshooting Support**
- Check `.agents/README.md` for system overview
- Review `CLAUDE.md` for project-specific guidance
- Examine `.claude-code/config.json` for configuration details
- Test individual MCP servers before full integration

**Your MCP server setup enables lightning-fast, construction industry-optimized development with Claude Code!** 🚀⚡