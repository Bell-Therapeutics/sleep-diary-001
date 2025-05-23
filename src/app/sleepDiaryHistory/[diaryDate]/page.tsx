"use client";

import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import CloseSvg from "@/assets/svg/close.svg";
import PreviousIcon from "@/assets/svg/previousIcon.svg";
import { SurveyResponseBox } from "@/components/SurveyResponseBox/SurveyResponesBox";
import { useEffect, useState } from "react";
import { SelectedTextType } from "@/components/SurveyResponseBox/SurveyResponesBox";
import LoadingBox from "@/components/LoadingBox/LoadingBox";

type SleepStatsResponse = {
  userId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  totalDiaries: number;
  averages: SleepStatAverage[];
};
type SleepStatAverage = {
  key: string;
  label: string;
  type: "INPUT_TIME" | "INPUT_NUMBER";
  average: string | number; // INPUT_TIME은 문자열, INPUT_NUMBER는 숫자
  averageRaw: number; // 항상 숫자 (분 단위 또는 원본 값)
  samplesCount: number;
};

type DiaryHistoryArrType = {
  key: string;
  label: string;
  type: string;
  value?: string;
  selectedText?: SelectedTextType;
};

type DiaryHistoryDataType = {
  createdAt: string;
  diaryDate: string;
  id: string;
  surveyResponses: DiaryHistoryArrType[];
  userId: string;
  userName: string;
};

const questionLabel = [
  `잠들기 전 최종적으로\n침대에 들어간 시간은 몇 시였나요?`,
  `잠들기를 시도한 시간을 몇 시였나요?`,
  `잠드는 데까지 몇 시간 몇 분이 걸렸나요?`,
  `잠든 순간 부터 마지막으로 깨어난 순간 사이,\n몇 번 잠에서 깼나요?`,
  `수면 도중 깨어있던 시간의 총합은\n몇 시간 몇 분 인가요?`,
  `최종적으로 잠에서 깬 시간은 몇 시 였나요?`,
  `아침에 침대에서 나온 시간은 몇 시였나요?`,
  `오늘의 수면의 질은 어떻게 평가하시겠습니까?`,
  `오늘 아침 깨어났을 때\n얼마나 상쾌하고 충분히 휴식을 취했다고 느꼈나요?`,
  `기타 의견`,
];

const DiaryHistory = () => {
  const param = useParams();
  const surveyDay = param.diaryDate;
  const router = useRouter();
  const [data, setData] = useState<DiaryHistoryDataType | null>(null);
  const [surveyDate, setSurveyDate] = useState<Date | null>(null);
  const [surveyAvg, setSurvetAvg] = useState<SleepStatsResponse | null>(null);
  const [isSpinAnimation, setIsSpinAnimation] = useState(true);
  const [isCheckDate, setIsCheckDate] = useState(false);

  const convertToDate = (dateString: string): Date => {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      router.push("/");
      return new Date(); // 기본값 반환
    }
    const date = new Date(dateString);

    const [year, month, day] = dateString.split("-").map(Number);
    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);

    return date;
  };

  // URL을 통한 유효하지 않은 날짜 접근 체크
  const checkValidDateAccess = (date: Date) => {
    const validFrom = localStorage.getItem("valid_from");
    if (!validFrom) return true;

    const validFromDate = new Date(validFrom);
    validFromDate.setHours(0, 0, 0, 0);

    // 현재 날짜가 valid_from보다 작으면 홈으로 리다이렉트
    if (date.getTime() < validFromDate.getTime()) {
      alert("접근할 수 없는 날짜입니다.");
      router.push("/");
      return false;
    }
    return true;
  };

  // valid_from과 같은 날짜일 때만 이전 버튼 비활성화
  const isPrevDisabled = (date: Date) => {
    const validFrom = localStorage.getItem("valid_from");
    if (!validFrom) return false;

    const validFromDate = new Date(validFrom);
    validFromDate.setHours(0, 0, 0, 0);

    // valid_from과 정확히 같은 날짜일 때만 비활성화
    return date.getTime() === validFromDate.getTime();
  };

  const navigateToDate = (direction: "prev" | "next") => {
    if (!surveyDate) return;

    const newDate = new Date(surveyDate);

    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 1);

      // valid_from 체크
      const validFrom = localStorage.getItem("valid_from");
      if (validFrom) {
        const validFromDate = new Date(validFrom);
        validFromDate.setHours(0, 0, 0, 0);

        // valid_from보다 작을 때만 이동 중지
        if (newDate.getTime() < validFromDate.getTime()) {
          return;
        }
        // 여기서는 newDate.getTime() === validFromDate.getTime()인 경우는 이동이 가능함
      }
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }

    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, "0");
    const day = String(newDate.getDate()).padStart(2, "0");

    const formattedDate = `${year}-${month}-${day}`;
    router.replace(`/sleepDiaryHistory/${formattedDate}`);
  };

  useEffect(() => {
    if (surveyDay && typeof surveyDay === "string") {
      const date = convertToDate(surveyDay);
      setSurveyDate(date);

      // URL 접근 유효성 체크
      checkValidDateAccess(date);
    }
  }, [surveyDay]);

  useEffect(() => {
    if (surveyDate) {
      setIsCheckDate(isPrevDisabled(surveyDate));

      // 디버깅 로그
      console.log("Current date:", surveyDate);
      console.log("Is prev button disabled:", isPrevDisabled(surveyDate));

      // valid_from 확인
      const validFrom = localStorage.getItem("valid_from");
      if (validFrom) {
        console.log("Valid from date:", new Date(validFrom));
      }
    }
  }, [surveyDate]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const startDate = localStorage.getItem("valid_from");
    const endDate = localStorage.getItem("valid_to");

    if (userId) {
      const getDiaryHistory = async () => {
        try {
          const { data } = await axios.get(
            `https://sleep-diary-001.vercel.app/api/diaryHistory?userId=${userId}&yearMonthDay=${param.diaryDate}`,
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (data && data.data) {
            setData(data.data);
          } else {
            setIsSpinAnimation(false);
          }
        } catch (error) {
          console.error("Error fetching diary history:", error);
        }
      };

      const getAvg = async () => {
        try {
          const { data } = await axios.get(
            `https://sleep-diary-001.vercel.app/api/getSurveyAvg?userId=${userId}&startDate=${startDate}&endDate=${endDate}`
          );

          if (data) {
            setSurvetAvg(data);
          }
        } catch (error) {
          console.error(error);
        }
      };

      getAvg();
      getDiaryHistory();
    }
  }, [param.diaryDate]);

  if (!surveyDate) {
    return <div>loading...</div>;
  }

  return (
    <div className="flex-1 pb-[44px] mobleHeight:pb-[25px] bg-white px-6 flex flex-col">
      <div className="w-[100%] h-[44px] flex justify-center items-center relative mt-[20px]">
        <h1 className="text-[22px] text-gray-primary font-bold">수면 일기</h1>
        <div className="absolute right-0" onClick={router.back}>
          <Image src={CloseSvg} alt={"닫기 버튼"} />
        </div>
      </div>
      <div className="w-full flex flex-col mt-[24px]">
        <div className="w-[100%] flex items-center justify-between">
          <div
            className={`w-[20px] h-[12px] ${
              isCheckDate ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
            }`}
            onClick={() => !isCheckDate && navigateToDate("prev")}
          >
            <Image src={PreviousIcon} alt="왼쪽화살표" />
          </div>
          <p className="text-gray-primary text-[16px] mobleHeight:text-[14px] font-[500]">
            {`${surveyDate.getFullYear()}년 ${
              surveyDate.getMonth() + 1
            }월 ${surveyDate.getDate()}일`}
          </p>
          <div
            className="w-[20px] h-[12px] rotate-180"
            onClick={() => navigateToDate("next")}
          >
            <Image src={PreviousIcon} alt="오른쪽화살표" />
          </div>
        </div>
      </div>
      {data ? (
        <div
          className="mt-[20px] flex flex-col gap-[14px] overflow-scroll"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {questionLabel.map((question, index) => {
            const response = data.surveyResponses.slice(2)[index];
            const displayValue =
              response?.value || response?.selectedText || "";
            const average =
              surveyAvg?.averages && index < surveyAvg.averages.length
                ? surveyAvg.averages[index].average
                : "";

            return (
              <SurveyResponseBox
                key={index}
                questionLabel={question}
                type={response?.type || ""}
                selectedText={response?.selectedText}
                value={displayValue}
                surveyAvg={average}
                isFirstSuyvey={surveyAvg?.totalDiaries !== 1}
              />
            );
          })}
        </div>
      ) : (
        <LoadingBox isSpinAnimation={isSpinAnimation} />
      )}
    </div>
  );
};

export default DiaryHistory;
