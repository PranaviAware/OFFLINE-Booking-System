package com.officelink.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.data.domain.Page;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class DataListResponse<T> {
    private int count;
    private Long total;
    private Integer page;
    private Integer totalPages;
    private List<T> data;

    public DataListResponse() {
    }

    public DataListResponse(int count, List<T> data) {
        this.count = count;
        this.data = data;
        this.total = (long) count;
    }

    public DataListResponse(int count, Long total, Integer page, Integer totalPages, List<T> data) {
        this.count = count;
        this.total = total;
        this.page = page;
        this.totalPages = totalPages;
        this.data = data;
    }

    public static <T> DataListResponse<T> of(List<T> list) {
        return new DataListResponse<>(list != null ? list.size() : 0, list);
    }

    public static <T> DataListResponse<T> of(Page<T> page) {
        if (page == null) {
            return new DataListResponse<>(0, null);
        }
        return new DataListResponse<>(
                page.getNumberOfElements(),
                page.getTotalElements(),
                page.getNumber(),
                page.getTotalPages(),
                page.getContent()
        );
    }

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = count;
    }

    public Long getTotal() {
        return total;
    }

    public void setTotal(Long total) {
        this.total = total;
    }

    public Integer getPage() {
        return page;
    }

    public void setPage(Integer page) {
        this.page = page;
    }

    public Integer getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(Integer totalPages) {
        this.totalPages = totalPages;
    }

    public List<T> getData() {
        return data;
    }

    public void setData(List<T> data) {
        this.data = data;
    }
}
