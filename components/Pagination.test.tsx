import { expect, test, describe, mock, afterEach } from "bun:test";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import Pagination from "./Pagination";

describe("Pagination Component", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    onPageChange: mock((page: number) => {}),
    itemsPerPage: 10,
    totalItems: 50,
    label: "Items"
  };

  test("does not render if totalPages is 1 or less", () => {
    const { container } = render(<Pagination {...defaultProps} totalPages={1} />);
    expect(container.firstChild).toBeNull();

    const { container: containerZero } = render(<Pagination {...defaultProps} totalPages={0} />);
    expect(containerZero.firstChild).toBeNull();
  });

  test("renders correctly with multiple pages", () => {
    render(<Pagination {...defaultProps} />);

    expect(screen.getByText(/Showing/)).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText("50")).toBeTruthy();
    expect(screen.getByText(/Items/)).toBeTruthy();
    expect(screen.getByText("1 / 5")).toBeTruthy();
  });

  test("shows correct item range on different pages", () => {
    render(<Pagination {...defaultProps} currentPage={2} />);

    // Page 2 of 50 items, 10 items per page should show 11 to 20
    expect(screen.getByText("11")).toBeTruthy();
    expect(screen.getByText("20")).toBeTruthy();
    expect(screen.getByText("2 / 5")).toBeTruthy();
  });

  test("handles last page item range correctly", () => {
    render(<Pagination {...defaultProps} currentPage={5} />);

    // Page 5 of 50 items, 10 items per page should show 41 to 50 of 50
    expect(screen.getByText("41")).toBeTruthy();
    // 50 appears twice: "to 50" and "of 50"
    expect(screen.getAllByText("50").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("5 / 5")).toBeTruthy();
  });

  test("handles last page with fewer items than itemsPerPage", () => {
    render(<Pagination {...defaultProps} currentPage={5} totalItems={45} totalPages={5} />);

    // Page 5 of 45 items, 10 items per page should show 41 to 45 of 45
    expect(screen.getByText("41")).toBeTruthy();
    // 45 appears twice: "to 45" and "of 45"
    expect(screen.getAllByText("45").length).toBeGreaterThanOrEqual(2);
  });

  test("previous button is disabled on first page", () => {
    render(<Pagination {...defaultProps} currentPage={1} />);

    const prevButton = screen.getByLabelText("Previous page");
    expect(prevButton.hasAttribute("disabled")).toBe(true);
  });

  test("next button is disabled on last page", () => {
    render(<Pagination {...defaultProps} currentPage={5} />);

    const nextButton = screen.getByLabelText("Next page");
    expect(nextButton.hasAttribute("disabled")).toBe(true);
  });

  test("calls onPageChange when previous button is clicked", () => {
    const onPageChange = mock((page: number) => {});
    render(<Pagination {...defaultProps} currentPage={2} onPageChange={onPageChange} />);

    const prevButton = screen.getByLabelText("Previous page");
    fireEvent.click(prevButton);

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  test("calls onPageChange when next button is clicked", () => {
    const onPageChange = mock((page: number) => {});
    render(<Pagination {...defaultProps} currentPage={2} onPageChange={onPageChange} />);

    const nextButton = screen.getByLabelText("Next page");
    fireEvent.click(nextButton);

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  test("uses custom label correctly", () => {
    render(<Pagination {...defaultProps} label="Articles" />);
    expect(screen.getByText(/Articles/)).toBeTruthy();
  });
});
