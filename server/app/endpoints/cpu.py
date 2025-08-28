from fastapi import APIRouter, HTTPException
from app.models.cpu import SchedulingRequest, Process
from app.models.response import ApiResponse
from app.services.cpu import CPUSchedulingService

router = APIRouter(prefix="/api/cpu", tags=["CPU Scheduling"])

def convert_dict_to_scheduling_request(data: dict) -> SchedulingRequest:
    """Convert frontend dictionary to SchedulingRequest model"""
    processes = []
    for process_data in data.get('processes', []):
        process = Process(
            pid=process_data.get('id', process_data.get('pid', 1)),
            arrival_time=process_data.get('arrival_time', 0),
            burst_time=process_data.get('burst_time', 1),
            priority=process_data.get('priority', 0)
        )
        processes.append(process)
    
    return SchedulingRequest(
        processes=processes,
        context_switch_cost=data.get('context_switch_cost', 0.5),
        time_quantum=data.get('time_quantum'),
        preemptive=data.get('preemptive', False),
        mlfq_config=data.get('mlfq_config')
    )

@router.post("/fcfs", response_model=ApiResponse)
async def fcfs_scheduling(request_data: dict):
    try:
        print(f"FCFS Request received: {request_data}")
        request = convert_dict_to_scheduling_request(request_data)
        result = CPUSchedulingService.fcfs(request)
        
        return ApiResponse(
            success=True,
            message="FCFS scheduling completed successfully",
            data=result.dict()
        )
    except Exception as e:
        print(f"FCFS Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sjf", response_model=ApiResponse)
async def sjf_scheduling(request_data: dict):
    try:
        print(f"SJF Request received: {request_data}")
        request = convert_dict_to_scheduling_request(request_data)
        result = CPUSchedulingService.sjf(request)
        
        return ApiResponse(
            success=True,
            message="SJF scheduling completed successfully",
            data=result.dict()
        )
    except Exception as e:
        print(f"SJF Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/priority", response_model=ApiResponse)
async def priority_scheduling(request_data: dict):
    try:
        print(f"Priority Request received: {request_data}")
        request = convert_dict_to_scheduling_request(request_data)
        result = CPUSchedulingService.priority_scheduling(request)
        
        return ApiResponse(
            success=True,
            message="Priority scheduling completed successfully",
            data=result.dict()
        )
    except Exception as e:
        print(f"Priority Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/round-robin", response_model=ApiResponse)
async def round_robin_scheduling(request_data: dict):
    try:
        print(f"Round Robin Request received: {request_data}")
        
        if not request_data.get('time_quantum') or request_data.get('time_quantum', 0) <= 0:
            raise HTTPException(
                status_code=400,
                detail="Time quantum must be specified and greater than 0 for Round Robin scheduling"
            )
        
        request = convert_dict_to_scheduling_request(request_data)
        result = CPUSchedulingService.round_robin(request)
        
        return ApiResponse(
            success=True,
            message="Round Robin scheduling completed successfully",
            data=result.dict()
        )
    except Exception as e:
        print(f"Round Robin Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mlfq", response_model=ApiResponse)
async def mlfq_scheduling(request_data: dict):
    try:
        print(f"MLFQ Request received: {request_data}")
        request = convert_dict_to_scheduling_request(request_data)
        result = CPUSchedulingService.mlfq(request)
        
        return ApiResponse(
            success=True,
            message="MLFQ scheduling completed successfully",
            data=result.dict()
        )
    except Exception as e:
        print(f"MLFQ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/algorithms")
async def get_algorithms():
    """Get list of supported scheduling algorithms"""
    return ApiResponse(
        success=True,
        message="Supported algorithms retrieved",
        data={
            "algorithms": [
                {"name": "FCFS", "description": "First Come First Serve", "implemented": True},
                {"name": "SJF", "description": "Shortest Job First", "implemented": True},
                {"name": "Priority", "description": "Priority Scheduling", "implemented": True},
                {"name": "RoundRobin", "description": "Round Robin", "implemented": True},
                {"name": "MLFQ", "description": "Multi-Level Feedback Queue", "implemented": True}
            ]
        }
    )

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "CPU Scheduling"}