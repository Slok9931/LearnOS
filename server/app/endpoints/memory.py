from fastapi import APIRouter, HTTPException
from app.models.memory import MemoryRequest, LinearAllocationConfig, SegmentationConfig, PagingConfig, MultiLevelPagingConfig
from app.models.response import APIResponse
from app.services.memory import memory_service

router = APIRouter()


def _validate_request(request: MemoryRequest, expected_config, label: str) -> None:
    """Common validation shared by every memory endpoint (raises HTTP 400)."""
    if not isinstance(request.config, expected_config):
        raise HTTPException(status_code=400, detail=f"Invalid configuration for {label}")
    if not request.processes:
        raise HTTPException(status_code=400, detail="No processes provided")
    ids = [p.id for p in request.processes]
    if len(ids) != len(set(ids)):
        raise HTTPException(status_code=400, detail="Process ids must be unique")
    for process in request.processes:
        if process.size <= 0:
            raise HTTPException(status_code=400, detail=f"Process {process.name} has invalid size")
        if process.arrival_time < 0:
            raise HTTPException(status_code=400, detail=f"Process {process.name} has invalid arrival time")
        if process.duration is not None and process.duration <= 0:
            raise HTTPException(status_code=400, detail=f"Process {process.name} has invalid duration")
    total = getattr(request.config, "total_memory", 0)
    if total <= 0:
        raise HTTPException(status_code=400, detail="Total memory must be greater than 0")

@router.post("/api/memory/linear")
async def linear_allocation(request: MemoryRequest):
    """
    Linear/Contiguous Memory Allocation
    
    Supports different allocation strategies:
    - First Fit: Allocate first available block that fits
    - Best Fit: Allocate smallest available block that fits
    - Worst Fit: Allocate largest available block that fits
    - Next Fit: Allocate next available block after last allocation
    
    Features:
    - Memory compaction to reduce external fragmentation
    - Visualization of memory layout and fragmentation
    - Detailed allocation timeline and statistics
    """
    try:
        _validate_request(request, LinearAllocationConfig, "linear allocation")
        if request.config.os_reserved < 0:
            raise HTTPException(status_code=400, detail="OS reserved memory cannot be negative")
        
        result = memory_service.linear_allocation(request)
        
        return APIResponse(
            success=True,
            message="Linear allocation completed successfully",
            data=result
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/api/memory/segmentation")
async def segmentation(request: MemoryRequest):
    """
    Segmentation Memory Management
    
    Features:
    - Logical segments (code, data, stack, heap)
    - Segment protection and sharing
    - Base and limit registers for each segment
    - Support for variable-sized segments
    
    Each process can have multiple segments with different:
    - Types (code, data, stack, heap)
    - Sizes and protection attributes
    - Base addresses and limits
    """
    try:
        _validate_request(request, SegmentationConfig, "segmentation")
        if request.config.max_segments_per_process < 1 or request.config.segment_table_size < 1:
            raise HTTPException(status_code=400, detail="Segment limits must be at least 1")
        
        result = memory_service.segmentation(request)
        
        return APIResponse(
            success=True,
            message="Segmentation completed successfully",
            data=result
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/api/memory/paging")
async def paging(request: MemoryRequest):
    """
    Paging Memory Management
    
    Features:
    - Fixed-size pages and frames
    - Page tables for address translation
    - Virtual memory with page replacement algorithms
    - TLB (Translation Lookaside Buffer) simulation
    
    Supported page replacement algorithms:
    - FIFO (First In, First Out)
    - LRU (Least Recently Used)
    - LFU (Least Frequently Used)
    - Optimal (Belady's algorithm)
    - Clock algorithm
    - Second Chance algorithm
    """
    try:
        _validate_request(request, PagingConfig, "paging")
        if request.config.page_size <= 0:
            raise HTTPException(status_code=400, detail="Page size must be greater than 0")
        if request.config.total_memory < request.config.page_size:
            raise HTTPException(status_code=400, detail="Memory must hold at least one page")
        
        result = memory_service.paging(request)
        
        return APIResponse(
            success=True,
            message="Paging completed successfully",
            data=result
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/api/memory/multi-level-paging")
async def multi_level_paging(request: MemoryRequest):
    """
    Multi-Level Paging Memory Management
    
    Features:
    - Hierarchical page tables (2-level, 3-level, etc.)
    - Demand paging with working set management
    - Advanced page replacement algorithms
    - Page fault handling and swap management
    - Memory-mapped files simulation
    
    Benefits:
    - Reduced page table space overhead
    - Support for large virtual address spaces
    - Efficient memory utilization
    - Working set-based locality optimization
    """
    try:
        _validate_request(request, MultiLevelPagingConfig, "multi-level paging")
        
        # Validate configuration
        if not 2 <= request.config.levels <= 4:
            raise HTTPException(status_code=400, detail="Multi-level paging supports 2 to 4 levels")
        
        page_size = request.config.page_size
        if page_size <= 0 or page_size & (page_size - 1):
            raise HTTPException(status_code=400, detail="Page size must be a power of two (KB)")
        if request.config.total_memory < page_size:
            raise HTTPException(status_code=400, detail="Memory must hold at least one page")
        
        if request.config.working_set_size <= 0:
            raise HTTPException(status_code=400, detail="Working set size must be greater than 0")
        
        result = memory_service.multi_level_paging(request)
        
        return APIResponse(
            success=True,
            message="Multi-level paging completed successfully",
            data=result
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/api/memory/algorithms")
async def get_memory_algorithms():
    """
    Get list of supported memory management algorithms
    """
    try:
        algorithms = {
            "linear": {
                "name": "Linear/Contiguous Allocation",
                "description": "Contiguous memory allocation with different fit strategies",
                "methods": ["first_fit", "best_fit", "worst_fit", "next_fit"],
                "features": ["compaction", "fragmentation_analysis"]
            },
            "segmentation": {
                "name": "Segmentation",
                "description": "Logical segmentation with protection and sharing",
                "features": ["variable_segments", "protection", "sharing"]
            },
            "paging": {
                "name": "Paging",
                "description": "Fixed-size paging with virtual memory",
                "features": ["page_replacement", "tlb", "virtual_memory"],
                "replacement_algorithms": ["fifo", "lru", "lfu", "optimal", "clock", "second_chance"]
            },
            "multi_level_paging": {
                "name": "Multi-Level Paging",
                "description": "Hierarchical paging with demand loading",
                "features": ["hierarchical_tables", "demand_paging", "working_set"],
                "levels": [2, 3, 4]
            }
        }
        
        return APIResponse(
            success=True,
            message="Memory algorithms retrieved successfully",
            data=algorithms
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/api/memory/health")
async def memory_health_check():
    """
    Health check endpoint for memory management service
    """
    try:
        return APIResponse(
            success=True,
            message="Memory management service is healthy",
            data={
                "status": "healthy",
                "service": "memory_management",
                "algorithms": ["linear", "segmentation", "paging", "multi_level_paging"]
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")