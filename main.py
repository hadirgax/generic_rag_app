from dotenv import load_dotenv
from importlib.metadata import version
load_dotenv()

core_version = version("langchain_core")
lg_version = version("langgraph")
from langchain_ollama import ChatOllama


print(f"LangChain Core Version: {core_version}")
print(f"LangGraph Version: {lg_version}")

def main():
    # Test chat ollama
    # llm = ChatOllama(model="gemma4:e4b", temperature=0) # slow
    # llm = ChatOllama(model="gemma4:e2b", temperature=0) # fast
    llm = ChatOllama(model="llama3.2:3b", temperature=0) # fast
    # llm = ChatOllama(model="qwen3.5:0.8b", temperature=0) # slow
    response = llm.invoke("Say 'setup complete!' in one word")
    print(f"Response from ChatOllama: {response}")

    print("Setup complete!")



if __name__ == "__main__":
    main()
