from fastapi import FastAPI
from schemas import DeckRequest
from anki_utils import create_anki_package

app = FastAPI(title="Anki Exporter Service")

@app.post("/generate")
async def generate_deck(req: DeckRequest):
    out_file = create_anki_package(req)
    return {"status": "success", "file_path": out_file}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
