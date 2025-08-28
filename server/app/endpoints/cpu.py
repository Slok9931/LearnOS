from fastapi import APIRouter, HTTPException
from app.models.cpu import SchedulingRequest
from app.models.response import APIResponse
from app.services.cpu import cpu_service

router = APIRouter()

@router.post("/api/cpu/fcfs")
async def fcfs(request: SchedulingRequest):
    try:
        result = cpu_service.fcfs(request)
        return APIResponse(success=True, data=result, message="FCFS scheduling completed successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/cpu/sjf")
async def sjf(request: SchedulingRequest):
    try:
        result = cpu_service.sjf(request)
        return APIResponse(success=True, data=result, message="SJF scheduling completed successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/cpu/priority")
async def priority(request: SchedulingRequest):
    try:
        result = cpu_service.priority_scheduling(request)
        return APIResponse(success=True, data=result, message="Priority scheduling completed successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/cpu/round-robin")
async def round_robin(request: SchedulingRequest):
    try:
        result = cpu_service.round_robin(request)
        return APIResponse(success=True, data=result, message="Round Robin scheduling completed successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/cpu/mlfq")
async def mlfq(request: SchedulingRequest):
    try:
        result = cpu_service.mlfq(request)
        return APIResponse(success=True, data=result, message="MLFQ scheduling completed successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))